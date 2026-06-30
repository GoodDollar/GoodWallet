import type { FixedNumber } from "ethers"
import {
  Client,
  dropsToXrp,
  isValidAddress,
  type Payment,
  type SubmittableTransaction,
  xrpToDrops,
} from "xrpl"

import { XRP_CHAIN_ID, XRP_TESTNET_CHAIN_ID } from "@/chain/chain-ids"
import { XRP_FAMILY, XRP_TESTNET_FAMILY } from "@/chain/types"
import { config } from "@/config"
import { parseAmount } from "@/ethers-utils"
import type { Tx } from "@/hooks/useLedger/types"
import { NormalizedAddressMap } from "@/hooks/useTokenBalances/NormalizedAddressMap"

import type { Fees, SUPPORTED_XRP_FAMILIES, XRPProvider } from "./types"

/**
 * XRP accounts MUST have at least 1 XRP in their balance to be considered active accounts.
 * In case the user does not have at least 1 XRP, functions like account_info will fail stating that the
 * account was not found, this is intended and normal behaviour
 */
export const getXrpProvider = (family: SUPPORTED_XRP_FAMILIES): XRPProvider => {
  const client = new Client(urlByFamily(family))

  return {
    family,
    DUST_AMOUNT: Number(xrpToDrops(0.00001)),
    getAddressForName: async (_name: string) => Promise.resolve(null),
    getNameForAddress: async (_name: string) => Promise.resolve(null),
    isValidAddress: isValidAddress,
    getAmounts: async (_, tokensOfChain, address) => {
      const amountsForChain = new NormalizedAddressMap<string, FixedNumber>(
        family,
      )
      try {
        await client.connect()
        const [accountInfo, serverInfo] = await Promise.all([
          client.request({
            command: "account_info",
            account: address,
            ledger_index: "validated",
          }),
          client.request({
            command: "server_info",
          }),
        ])
        const {
          result: { account_data },
        } = accountInfo
        const {
          result: {
            info: { validated_ledger },
          },
        } = serverInfo

        if (validated_ledger === undefined) {
          throw new Error(`validated_ledger cannot be null`)
        }

        const xrpNative = tokensOfChain.native
        const accountBalance = dropsToXrp(account_data.Balance)

        if (xrpNative) {
          const amount = parseAmount(accountBalance)
          amountsForChain.set(xrpNative.address, amount)
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("Account not found.")) {
          // Do nothing as an account
          // doesn't exist before it's funded with 1 XRP
        } else {
          console.error("xrp getAmounts", e)
        }
      }

      return amountsForChain
    },
    getTransactions: async (chainId, address) => {
      try {
        const family =
          chainId === XRP_CHAIN_ID ? XRP_FAMILY : XRP_TESTNET_FAMILY
        const res = await fetch(
          `/api/chains/${family}/addresses/${address}/history`,
        )
        if (res.status === 200) {
          const resParsed = (await res.json()) as Tx[]
          return resParsed
        } else {
          return []
        }
      } catch (error) {
        console.error(error)
      }
      return []
    },
    getNetworkFee: async () => {
      await client.connect()
      const {
        result: {
          info: { validated_ledger, load_factor },
        },
      } = await client.request({
        command: "server_info",
      })
      if (!validated_ledger || !load_factor) {
        throw new Error("Could not find base fee for XRP")
      }
      return { baseFee: validated_ledger.base_fee_xrp, loadFactor: load_factor }
    },
    createNativeSendTransaction: async (
      from: string,
      to: string,
      amountInXrp: string,
      fees?: Fees,
    ) => {
      const tx: SubmittableTransaction = {
        TransactionType: "Payment",
        Account: from,
        Amount: xrpToDrops(Number(amountInXrp)),
        Destination: to,
      }
      if (fees) {
        tx.Fee = xrpToDrops(fees.baseFee * fees.loadFactor).toString()
      }
      const prepared = await client.autofill(tx)
      return prepared
    },
    broadcastTransaction: async (tx: { tx_blob: string; hash: string }) => {
      await client.connect()
      return await client.submitAndWait<Payment>(tx.tx_blob)
    },
  }
}

export const urlByFamily = (family: SUPPORTED_XRP_FAMILIES) => {
  switch (family) {
    case XRP_FAMILY:
      return config.xrpRpcUrls[XRP_CHAIN_ID]
    case XRP_TESTNET_FAMILY:
      return config.xrpRpcUrls[XRP_TESTNET_CHAIN_ID]
    default:
      throw new Error(`Family not supported`)
  }
}
