"use server"

import { isAddress } from "gill"

import type { SUPPORTED_FAMILIES } from "@/chain/provider/Solana/types"
import { getAllSolanaTransactions } from "@/hooks/useLedger/alchemySolanaHandler"
import type { Tx } from "@/hooks/useLedger/types"

export const getSolanaHistory = async (
  address: string,
  family: SUPPORTED_FAMILIES,
): Promise<Tx[]> => {
  if (!isAddress(address)) {
    throw new Error(`${address} is not a valid Solana address`)
  }

  const transactions = await getAllSolanaTransactions(address, family)

  return transactions.sort((a, b) => b.timestamp - a.timestamp)
}
