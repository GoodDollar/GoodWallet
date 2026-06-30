import { isAddress } from "ethers"

import {
  BASE_CHAIN_ID,
  BNB_CHAIN_ID,
  CELO_CHAIN_ID,
  ETHEREUM_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  POLYGON_CHAIN_ID,
} from "@/chain/chain-ids"
import { AVAILABLE_CHAINS_IDS } from "@/chain/chains"
import { getAllAlchemyTransactions } from "@/hooks/useLedger/alchemyEVMHandler"
import { getAllScanTransactions } from "@/hooks/useLedger/scanEVMHandler"
import type { Tx } from "@/hooks/useLedger/types"

export const getEVMHistory = async (chainId: number, address: string) => {
  if (!AVAILABLE_CHAINS_IDS.includes(chainId)) {
    throw new Error(`Chain ID ${chainId} not supported`)
  }
  if (!isAddress(address)) {
    throw new Error(`${address} is not a valid address`)
  }

  const transactions: Tx[] = await getTransactions(chainId, address)
  return transactions
    .filter(
      (tx) =>
        tx.from.toLowerCase() === address.toLowerCase() ||
        tx.to.toLowerCase() === address.toLowerCase(),
    )
    .sort((a, b) => b.timestamp - a.timestamp)
}

const getTransactions = async (chainId: number, address: string) => {
  switch (chainId) {
    case ETHEREUM_CHAIN_ID:
    case POLYGON_CHAIN_ID:
    case BASE_CHAIN_ID:
    case OPTIMISM_CHAIN_ID:
    case CELO_CHAIN_ID:
    case BNB_CHAIN_ID:
      return await getAllAlchemyTransactions(chainId, address)
    default:
      return await getAllScanTransactions(chainId, address)
  }
}
