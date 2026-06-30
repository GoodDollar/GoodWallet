import { address, networks, Psbt } from "bitcoinjs-lib"
import { toOutputScript } from "bitcoinjs-lib/src/address"
import { type FixedNumber, formatUnits, parseUnits } from "ethers/utils"

import {
  BITCOIN_FAMILY,
  BITCOIN_TESTNET_FAMILY,
  DOGE_FAMILY,
  DOGE_TESTNET_FAMILY,
} from "@/chain/types"
import { parseAmount } from "@/ethers-utils/utils"
import { getAllBitcoinTransactions } from "@/hooks/useLedger/tatumBitcoinHandler"
import { NormalizedAddressMap } from "@/hooks/useTokenBalances/NormalizedAddressMap"
import { dogeNetwork, dogeTestNetwork } from "@/login/adapters/bitcoinNetworks"

import type {
  BitcoinProvider,
  ParsedBalanceSchema,
  SUPPORTED_UTXO_FAMILIES,
} from "./types"
import { isTransactionConfirmed } from "./utils"

const getDustAmount = (family: SUPPORTED_UTXO_FAMILIES) => {
  switch (family) {
    case BITCOIN_FAMILY:
    case BITCOIN_TESTNET_FAMILY:
      return 546
    case DOGE_FAMILY:
    case DOGE_TESTNET_FAMILY:
      return 1000000 // 0.01 Doge : https://github.com/dogecoin/dogecoin/blob/master/doc/fee-recommendation.md#dust-limits
    default:
      throw new Error(`Unsupported family: ${family}`)
  }
}

const getNetwork = (family: SUPPORTED_UTXO_FAMILIES) => {
  switch (family) {
    case BITCOIN_FAMILY:
      return networks.bitcoin
    case BITCOIN_TESTNET_FAMILY:
      return networks.testnet
    case DOGE_FAMILY:
      return dogeNetwork
    case DOGE_TESTNET_FAMILY:
      return dogeTestNetwork
    default:
      throw new Error(`Unsupported family: ${family}`)
  }
}

const getTxType = (family: SUPPORTED_UTXO_FAMILIES) => {
  switch (family) {
    case BITCOIN_FAMILY:
    case BITCOIN_TESTNET_FAMILY:
      return "segwit"
    case DOGE_FAMILY:
    case DOGE_TESTNET_FAMILY:
      return "legacy"
    default:
      throw new Error(`Unsupported family: ${family}`)
  }
}

export const getBitcoinProvider = (
  family: SUPPORTED_UTXO_FAMILIES,
): BitcoinProvider => {
  const network = getNetwork(family)
  const txType = getTxType(family)

  const calculateTransactionSizeBytes = (inputs: number, outputs: number) => {
    switch (txType) {
      case "segwit":
        return 10 + inputs * 69 + outputs * 31
      case "legacy":
        return 10 + inputs * 148 + outputs * 34
    }
  }

  return {
    family,
    DUST_AMOUNT: getDustAmount(family),
    getAddressForName: async () => Promise.resolve(null),
    getNameForAddress: async () => Promise.resolve(null),
    isValidAddress: (address) => {
      try {
        return toOutputScript(address, network) !== null
      } catch {
        return false
      }
    },

    getAmounts: async (_, tokensOfChain, address) => {
      const amountsForChain = new NormalizedAddressMap<string, FixedNumber>(
        family,
      )
      const token = tokensOfChain.native
      if (!token) {
        return amountsForChain
      }

      const res = await fetch(
        `/api/chains/${family}/addresses/${address}/balance`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      )

      const resJson = (await res.json()) as ParsedBalanceSchema

      const balance = resJson.incoming - resJson.outgoing

      if (balance) {
        const satoshis = parseUnits(
          balance.toFixed(token.decimals),
          token.decimals,
        )
        const amount = parseAmount(satoshis, token.decimals)
        amountsForChain.set(token.address, amount)
      }
      return amountsForChain
    },
    getTransactions: async (_, address) =>
      getAllBitcoinTransactions(family, address),

    getNetworkFeeSatsPerByte: async () => {
      const resp = await fetch(`/api/chains/${family}/fee`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      })
      const result = await resp.json()

      switch (family) {
        case DOGE_FAMILY:
        case DOGE_TESTNET_FAMILY:
          // Medium feerate from Tatum for DOGE is usually way too high
          return Math.min(result.slow * 1.5, result.medium)
        default:
          return result.medium
      }
    },

    calculateNetworkFeeBytesRequired: calculateTransactionSizeBytes,

    createSendToPSBT: async (
      fromAddress,
      toAddress,
      amountSats,
      feePerByteSats,
    ) => {
      if (amountSats < BigInt(getDustAmount(family))) {
        throw new Error("Amount less than Dust")
      }

      const psbt = new Psbt({ network })

      const indicativeNetworkFeeSats =
        calculateTransactionSizeBytes(2, 2) * feePerByteSats
      const amountRequiredSats =
        amountSats + BigInt(Math.ceil(indicativeNetworkFeeSats))

      const params = new URLSearchParams({
        totalValueBtc: formatUnits(amountRequiredSats, 8),
      })
      const fullUrl = `/api/chains/${family}/addresses/${fromAddress}/utxos?${params}`

      const res = await fetch(fullUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
      const unspentUtxos = await res.json()

      //Add Inputs
      let totalValueSats = BigInt(0)
      for (const utxo of unspentUtxos) {
        if (totalValueSats > amountRequiredSats) {
          break
        }
        const utxoValueSats = parseUnits(utxo.value.toString(), 8)
        totalValueSats += utxoValueSats

        switch (txType) {
          case "legacy": {
            const res = await fetch(
              `/api/chains/${family}/transactions/${utxo.txHash}`,
              {
                method: "GET",
                headers: {
                  Accept: "application/json",
                },
              },
            )
            const rawTx = await res.json()

            psbt.addInput({
              hash: utxo.txHash,
              index: utxo.index,
              nonWitnessUtxo: Buffer.from(rawTx, "hex"),
            })
            break
          }
          case "segwit": {
            const witnessUtxoScript = address.toOutputScript(
              utxo.address,
              network,
            )
            psbt.addInput({
              hash: utxo.txHash,
              index: utxo.index,
              witnessUtxo: {
                script: witnessUtxoScript,
                value: utxoValueSats,
              },
            })
            break
          }
        }
      }

      if (totalValueSats < amountRequiredSats) {
        throw new Error("Insufficient funds")
      }

      const transactionSizeBytes = calculateTransactionSizeBytes(
        psbt.inputCount,
        2,
      )

      const networkFeeSats = BigInt(
        Math.ceil(transactionSizeBytes * feePerByteSats),
      )
      const changeSats = totalValueSats - amountSats - networkFeeSats

      //Add Outpus
      psbt.addOutput({
        address: toAddress,
        value: amountSats,
      })

      //Else it's added as additional network Fee
      if (changeSats > getDustAmount(family)) {
        psbt.addOutput({
          address: fromAddress,
          value: changeSats,
        })
      }
      return psbt
    },

    broadcastTransaction: async (txHex) => {
      const resp = await fetch(`/api/chains/${family}/transactions/broadcast`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: JSON.stringify({ txData: txHex }),
      })
      const txid = await resp.json()
      await isTransactionConfirmed(txid.txId, family)
      return txid.txId
    },
  }
}
