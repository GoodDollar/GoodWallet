import { proxy } from "valtio"
import { proxyMap } from "valtio/utils"

import { AVAILABLE_CHAINS_IDS } from "@/chain/chains"
import { getChainProvider } from "@/chain/provider/provider"
import type { Tx } from "@/hooks/useLedger/types"
import type { Addresses } from "@/login"

const REFRESH_INTERVAL_MS = 1000 * 60 * 10 // 10 minutes
const internalTxs = new Map<number, Tx[]>()
let lastRefreshAllTimestamp = 0

type ActivityHistoryStore = {
  perChain: Map<number, Tx[]>
  isLoading: boolean
  refreshHistory: (addresses: Addresses | undefined) => Promise<void>
  addPropagatingTx: (tx: Tx) => void
}

const combineTxs = (a: Tx[], b: Tx[]) => {
  const filteredA = a.filter(
    (tx) => !b.some((bTx) => bTx.hash.toLowerCase() === tx.hash.toLowerCase()),
  )
  const combined = filteredA.concat(b)
  return combined.sort((tx1, tx2) => tx2.timestamp - tx1.timestamp)
}

const addPropagatingTx = (tx: Tx) => {
  const internalTxsForChain = internalTxs.get(tx.chainId) || []
  const combinedInternalTxsForChain = combineTxs(internalTxsForChain, [tx])
  //If same length, no new internal txs added
  if (internalTxsForChain.length === combinedInternalTxsForChain.length) {
    return
  }
  internalTxs.set(tx.chainId, combinedInternalTxsForChain)
  const externalTxsForChain =
    activityHistoryStore.perChain.get(tx.chainId) || []
  const combinedTxsForChain = combineTxs(
    combinedInternalTxsForChain,
    externalTxsForChain,
  )
  activityHistoryStore.perChain.set(tx.chainId, combinedTxsForChain)
}

const refreshHistory = async (addresses: Addresses | undefined) => {
  const now = Date.now()
  if (!addresses || now - lastRefreshAllTimestamp < REFRESH_INTERVAL_MS) {
    return
  }

  lastRefreshAllTimestamp = now
  activityHistoryStore.isLoading = true

  try {
    await refreshAllChains(addresses)
  } catch (error) {
    console.error(error)
  } finally {
    activityHistoryStore.isLoading = false
  }
}

const refreshAllChains = async (addresses: Addresses) => {
  const promises = AVAILABLE_CHAINS_IDS.map((chainId) =>
    refreshHistorySingleChain(addresses, chainId),
  )
  await Promise.allSettled(promises)
}

const refreshHistorySingleChain = async (
  addresses: Addresses,
  chainId: number,
) => {
  const provider = getChainProvider(chainId)
  const address = addresses.get(provider.family)
  if (!address) {
    throw new Error(`Address not found for provider: ${provider.family}`)
  }
  const externalTxsForChain = await provider.getTransactions(chainId, address)
  const internalTxsForChain = internalTxs.get(chainId) || []

  const combinedTxsForChain = combineTxs(
    internalTxsForChain,
    externalTxsForChain,
  )
  activityHistoryStore.perChain.set(chainId, combinedTxsForChain)
}

export const activityHistoryStore = proxy<ActivityHistoryStore>({
  perChain: proxyMap(),
  isLoading: false,
  refreshHistory: refreshHistory,
  addPropagatingTx: addPropagatingTx,
})
