import type { FixedNumber } from "ethers/utils"
import type { Chain as ViemChain } from "viem/chains"

import type { Tx } from "@/hooks/useLedger/types"
import type { NormalizedAddressMap } from "@/hooks/useTokenBalances/NormalizedAddressMap"
import type { TokensOfChain } from "@/hooks/useTokenBalances/stores/amountsStore"

export const EVM_FAMILY = "EVM" as const
export const DOGE_FAMILY = "DOGE" as const
export const DOGE_TESTNET_FAMILY = "DOGE_TESTNET" as const
export const BITCOIN_FAMILY = "BTC" as const
export const BITCOIN_TESTNET_FAMILY = "BTC_TESTNET" as const
export const SOLANA_FAMILY = "SOLANA" as const
export const SOLANA_DEVNET_FAMILY = "SOLANA_DEVNET" as const
export const XRP_FAMILY = "XRP" as const
export const XRP_TESTNET_FAMILY = "XRP_TESTNET" as const

export const ChainFamily = [
  EVM_FAMILY,
  DOGE_FAMILY,
  DOGE_TESTNET_FAMILY,
  BITCOIN_FAMILY,
  BITCOIN_TESTNET_FAMILY,
  SOLANA_FAMILY,
  SOLANA_DEVNET_FAMILY,
  XRP_FAMILY,
  XRP_TESTNET_FAMILY,
] as const
export type ChainFamily = (typeof ChainFamily)[number]

export function isSupportedFamily(family: string): family is ChainFamily {
  return ChainFamily.includes(family as ChainFamily)
}

export type Chain = ViemChain & {
  family: ChainFamily
  tvl: number
}

export type ChainProvider = {
  isValidAddress: (address: string) => boolean
  getAddressForName: (name: string) => Promise<string | null>
  getNameForAddress: (address: string) => Promise<string | null>
  getAmounts: (
    chainId: number,
    tokensOfChain: TokensOfChain,
    address: string,
  ) => Promise<NormalizedAddressMap<string, FixedNumber>>
  getTransactions: (chainId: number, address: string) => Promise<Tx[]>
}
