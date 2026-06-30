import { CELO_CHAIN_ID, FUSE_CHAIN_ID, XDC_CHAIN_ID } from "@/chain/chain-ids"

export const GOODDOLLAR_NETS = [
  FUSE_CHAIN_ID,
  CELO_CHAIN_ID,
  XDC_CHAIN_ID,
] as const
export type ChainId = (typeof GOODDOLLAR_NETS)[number]

export type G$Contracts = "development" | "staging" | "production"

export type ClaimConfig = {
  contracts: G$Contracts
}

export type Apps = {
  identityUrl: string
  backend: string
}
