import type {
  Address,
  FullySignedTransaction,
  Lamports,
  MicroLamports,
  Signature,
  Transaction,
} from "gill"

import {
  type ChainProvider,
  SOLANA_DEVNET_FAMILY,
  SOLANA_FAMILY,
} from "@/chain/types"

export { SOLANA_DEVNET_FAMILY, SOLANA_FAMILY }

export const SUPPORTED_FAMILIES_VALUES = {
  SOLANA: SOLANA_FAMILY,
  SOLANA_DEVNET: SOLANA_DEVNET_FAMILY,
} as const

export type SUPPORTED_FAMILIES =
  (typeof SUPPORTED_FAMILIES_VALUES)[keyof typeof SUPPORTED_FAMILIES_VALUES]

export function isSupportedFamily(
  family: string,
): family is SUPPORTED_FAMILIES {
  return Object.values(SUPPORTED_FAMILIES_VALUES).includes(
    family as SUPPORTED_FAMILIES,
  )
}

export type SolanaProvider = ChainProvider & {
  family: SUPPORTED_FAMILIES

  createSendSolTransaction: (
    source: Address,
    destination: Address,
    amount: Lamports,
  ) => Promise<Transaction>

  createSendSplTransaction: (
    source: Address,
    destination: Address,
    mint: Address,
    tokenProgram: Address,
    amount: bigint,
  ) => Promise<Transaction>

  getTokenProgramForMint: (source: Address, mint: Address) => Address

  getAtaCreationCost: (
    destination: Address,
    mint: Address,
    tokenProgram: Address,
  ) => Promise<Lamports>

  getBaseFee: (tx: Transaction) => Promise<Lamports>

  getPrioritizationFee: () => Promise<MicroLamports>

  getComputeUnits: (tx: Transaction) => Promise<bigint>

  broadcastTransaction: (
    tx: Transaction & FullySignedTransaction,
  ) => Promise<Signature>
}
