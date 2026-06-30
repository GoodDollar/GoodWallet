import { formatUnits } from "ethers"

import {
  BITCOIN_CHAIN_ID,
  BITCOIN_TESTNET_CHAIN_ID,
  DOGE_CHAIN_ID,
  DOGE_TESTNET_CHAIN_ID,
} from "@/chain/chain-ids"
import type {
  ParsedBalanceSchema,
  SUPPORTED_UTXO_FAMILIES,
} from "@/chain/provider/Bitcoin/types"
import {
  BITCOIN_FAMILY,
  BITCOIN_TESTNET_FAMILY,
  DOGE_FAMILY,
  DOGE_TESTNET_FAMILY,
} from "@/chain/types"
import { BITCOIN_NATIVE_ADDRESS } from "@/ethers-utils"

import { type Tx, TxDirection } from "./types"

const getChainId = (family: SUPPORTED_UTXO_FAMILIES) => {
  switch (family) {
    case BITCOIN_FAMILY:
      return BITCOIN_CHAIN_ID
    case BITCOIN_TESTNET_FAMILY:
      return BITCOIN_TESTNET_CHAIN_ID
    case DOGE_FAMILY:
      return DOGE_CHAIN_ID
    case DOGE_TESTNET_FAMILY:
      return DOGE_TESTNET_CHAIN_ID
  }
}

export const getAllBitcoinTransactions = async (
  family: SUPPORTED_UTXO_FAMILIES,
  address: string,
) => {
  //preburn the balance (1 credits)
  let res = await fetch(`/api/chains/${family}/addresses/${address}/balance`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  })
  const resJson = (await res.json()) as ParsedBalanceSchema

  if (resJson.incoming <= 0) {
    return []
  }

  //Fetch history (20 credits)
  const txs: Tx[] = []

  res = await fetch(`/api/chains/${family}/addresses/${address}/history`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  })

  const tatumTxs = await res.json()
  for (const tatumTx of tatumTxs) {
    const uniqueInputs = new Map<string, string>()
    for (const input of tatumTx.inputs) {
      const inputAddress = input.coin.address
      if (!inputAddress || input.coin.value === 0) {
        continue
      }
      uniqueInputs.set(inputAddress.toLowerCase(), inputAddress)
    }
    const from =
      uniqueInputs.size > 1 ? "multiple" : uniqueInputs.values().next().value
    const txDirection = uniqueInputs.has(address.toLowerCase())
      ? TxDirection.OUTGOING
      : TxDirection.INCOMING

    let outputAmount = 0
    //We need to preserve casing of the addresses (val) while using lower case for the keys
    const uniqueOutputs = new Map<string, string>()
    for (const output of tatumTx.outputs) {
      const outputAddress = output.address
      if (!outputAddress || output.value === 0) {
        continue
      }
      const lowerCaseOutputAddress = outputAddress.toLowerCase()

      if (txDirection === TxDirection.OUTGOING) {
        if (lowerCaseOutputAddress === address.toLowerCase()) {
          //Change output
          continue
        }
      } else {
        if (lowerCaseOutputAddress !== address.toLowerCase()) {
          //Change output
          continue
        }
      }
      uniqueOutputs.set(lowerCaseOutputAddress, outputAddress)
      outputAmount += output.value
    }

    const to = uniqueOutputs.has(address.toLowerCase())
      ? address
      : uniqueOutputs.size > 1
        ? "multiple"
        : uniqueOutputs.values().next().value

    const amount = formatUnits(outputAmount.toString(), 8)

    //Tx's in mempool are reported with ms precision, whereas confirmed tx's are reported with s precision
    const digits = Math.round(tatumTx.time).toString().length
    const timestamp =
      digits > 10 ? Math.round(tatumTx.time / 1000) : tatumTx.time
    if (to && from) {
      txs.push({
        chainId: getChainId(family),
        hash: tatumTx.hash,
        amount,
        timestamp,
        from,
        to,
        tokenAddress: BITCOIN_NATIVE_ADDRESS,
        txDirection,
      })
    }
  }
  return txs
}
