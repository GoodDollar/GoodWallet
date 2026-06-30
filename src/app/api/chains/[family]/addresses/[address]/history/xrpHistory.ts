import { dropsToXrp } from "xrpl"
import z from "zod"

import { XRP_CHAIN_ID, XRP_TESTNET_CHAIN_ID } from "@/chain/chain-ids"
import type { SUPPORTED_XRP_FAMILIES } from "@/chain/provider/XRP/types"
import { XRP_FAMILY } from "@/chain/types"
import { tatumConfig } from "@/configServerless"
import { XRP_NATIVE_ADDRESS } from "@/ethers-utils"
import { TxDirection } from "@/hooks/useLedger/types"

const TxSchema = z.object({
  hash: z.string(),
  Account: z.string(),
  Amount: z.string(),
  Destination: z.string(),
  Fee: z.string(),
  date: z.number(),
})

const XRPTransactionSchema = z.object({
  tx: TxSchema,
  validated: z.boolean(),
})

const ResponseTatumHistoryXRPSchema = z.object({
  transactions: z.array(XRPTransactionSchema).default([]),
})

export const getXrpHistory = async (
  address: string,
  family: SUPPORTED_XRP_FAMILIES,
) => {
  const config = tatumConfig[family]
  if (!config.apiKey) throw new Error(`API Key not found for ${family}`)

  const res = await fetch(`https://api.tatum.io/v3/xrp/account/tx/${address}`, {
    headers: {
      "x-api-key": config.apiKey,
    },
  })

  if (!res.ok) {
    throw new Error(
      `Failed to get transactions for ${address} on ${family}: ${res.status}-${res.statusText}`,
    )
  }
  const jsonRespone = await res.json()
  const parsedResponse = ResponseTatumHistoryXRPSchema.safeParse(jsonRespone)
  // Ripple epochs do not use the standard unix timestamp that starts in 1970, they added an offset
  const offsetForRippleEpoch = 946684800
  return parsedResponse.data?.transactions.map(({ tx }) => {
    return {
      chainId: family === XRP_FAMILY ? XRP_CHAIN_ID : XRP_TESTNET_CHAIN_ID,
      hash: tx.hash,
      amount: dropsToXrp(tx.Amount),
      timestamp: new Date(tx.date + offsetForRippleEpoch).getTime(),
      from: tx.Account,
      to: tx.Destination,
      tokenAddress: XRP_NATIVE_ADDRESS,
      txDirection:
        tx.Destination === address
          ? TxDirection.INCOMING
          : TxDirection.OUTGOING,
    }
  })
}
