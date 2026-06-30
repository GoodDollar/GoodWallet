import type * as bitcoin from "bitcoinjs-lib"
import type { z } from "zod"

import type { BalanceSchema } from "@/app/api/schemas/schemas"
import {
  BITCOIN_FAMILY,
  BITCOIN_TESTNET_FAMILY,
  type ChainProvider,
  DOGE_FAMILY,
  DOGE_TESTNET_FAMILY,
} from "@/chain/types"

export const SUPPORTED_FAMILIES_VALUES = {
  BITCOIN: BITCOIN_FAMILY,
  BITCOIN_TESTNET: BITCOIN_TESTNET_FAMILY,
  DOGE: DOGE_FAMILY,
  DOGE_TESTNET: DOGE_TESTNET_FAMILY,
} as const

export type SUPPORTED_UTXO_FAMILIES =
  (typeof SUPPORTED_FAMILIES_VALUES)[keyof typeof SUPPORTED_FAMILIES_VALUES]

export function isSupportedFamily(
  family: string,
): family is SUPPORTED_UTXO_FAMILIES {
  return Object.values(SUPPORTED_FAMILIES_VALUES).includes(
    family as SUPPORTED_UTXO_FAMILIES,
  )
}

export type BitcoinProvider = ChainProvider & {
  family: SUPPORTED_UTXO_FAMILIES
  DUST_AMOUNT: number

  getNetworkFeeSatsPerByte: () => Promise<number>

  calculateNetworkFeeBytesRequired: (inputs: number, outputs: number) => number

  createSendToPSBT: (
    fromAddress: string,
    toAddress: string,
    amountSats: bigint,
    feePerByteSats: number,
  ) => Promise<bitcoin.Psbt>

  broadcastTransaction: (txHex: string) => Promise<string>
}

export type ParsedBalanceSchema = z.infer<typeof BalanceSchema>
