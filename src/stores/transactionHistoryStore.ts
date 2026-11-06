import { proxy } from "valtio"
import { proxyMap } from "valtio/utils"

import { getAvailableChainIds } from "@/chain/chains"
import { getChainProvider } from "@/chain/provider/provider"
import type { Tx } from "@/hooks/useLedger/types"
import type { Addresses } from "@/login"

const REFRESH_INTERVAL_MS = 1000 * 60 * 10 // 10 minutes

// History is keyed by account address so a previous account's entries cannot
// leak across sessions. Both the internal (propagating) txs and the last-refresh
// timestamp are reset whenever the active account changes.
let activeAccount: string | undefined
let currentAccountToken = 0
const internalTxs = new Map<number, Tx[]>()
let lastRefreshAllTimestamp = 0

export const getCurrentAccountToken = () => currentAccountToken

/**
 * Initializes the active account and token when a session begins.
 * If the account matches the currently active account, existing history is kept.
 */
export const initActivityAccount = (account: string | undefined) => {
  if (account !== activeAccount) {
    clearActivityHistory()
    activeAccount = account
  }
}

/**
 * Clears all cached history and resets the refresh timer.
 * Must be called whenever the active account changes so stale data from a
 * previous session cannot appear under a new account.
 */
export const clearActivityHistory = () => {
  activeAccount = undefined
  currentAccountToken++
  internalTxs.clear()
  lastRefreshAllTimestamp = 0
  activityHistoryStore.perChain = proxyMap()
}

type ActivityHistoryStore = {
  perChain: Map<number, Tx[]>
  isLoading: boolean
  refreshHistory: (addresses: Addresses | undefined) => Promise<void>
  addPropagatingTx: (tx: Tx, token: number) => void
  replacePropagatingTx: (
    chainId: number,
    oldHash: string,
    newHash: string,
    token: number,
  ) => void
  removePropagatingTx: (chainId: number, hash: string, token: number) => void
  getCurrentAccountToken: () => number
}

const combineTxs = (a: Tx[], b: Tx[]) => {
  const filteredA = a.filter(
    (tx) => !b.some((bTx) => bTx.hash.toLowerCase() === tx.hash.toLowerCase()),
  )
  const combined = filteredA.concat(b)
  return combined.sort((tx1, tx2) => tx2.timestamp - tx1.timestamp)
}

const addPropagatingTx = (tx: Tx, token: number) => {
  if (token !== currentAccountToken) {
    return
  }
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

const replacePropagatingTx = (
  chainId: number,
  oldHash: string,
  newHash: string,
  token: number,
) => {
  if (token !== currentAccountToken) {
    return
  }
  const oldLower = oldHash.toLowerCase()
  const newLower = newHash.toLowerCase()

  const internal = internalTxs.get(chainId)
  const perChain = activityHistoryStore.perChain.get(chainId)

  const replacementInPerChain =
    perChain?.some(
      (tx) =>
        tx.hash.toLowerCase() === newLower &&
        tx.hash.toLowerCase() !== oldLower,
    ) ?? false

  if (internal) {
    const hasReplacement =
      replacementInPerChain ||
      internal.some(
        (tx) =>
          tx.hash.toLowerCase() === newLower &&
          tx.hash.toLowerCase() !== oldLower,
      )
    if (hasReplacement) {
      internalTxs.set(
        chainId,
        internal.filter((tx) => tx.hash.toLowerCase() !== oldLower),
      )
    } else {
      internalTxs.set(
        chainId,
        internal.map((tx) =>
          tx.hash.toLowerCase() === oldLower ? { ...tx, hash: newHash } : tx,
        ),
      )
    }
  }

  if (perChain) {
    if (replacementInPerChain) {
      activityHistoryStore.perChain.set(
        chainId,
        perChain.filter((tx) => tx.hash.toLowerCase() !== oldLower),
      )
    } else {
      activityHistoryStore.perChain.set(
        chainId,
        perChain.map((tx) =>
          tx.hash.toLowerCase() === oldLower ? { ...tx, hash: newHash } : tx,
        ),
      )
    }
  }
}

const removePropagatingTx = (chainId: number, hash: string, token: number) => {
  if (token !== currentAccountToken) {
    return
  }
  const hashLower = hash.toLowerCase()
  const internal = internalTxs.get(chainId)
  if (internal) {
    internalTxs.set(
      chainId,
      internal.filter((tx) => tx.hash.toLowerCase() !== hashLower),
    )
  }
  const perChain = activityHistoryStore.perChain.get(chainId)
  if (perChain) {
    activityHistoryStore.perChain.set(
      chainId,
      perChain.filter((tx) => tx.hash.toLowerCase() !== hashLower),
    )
  }
}

const refreshHistory = async (addresses: Addresses | undefined) => {
  const now = Date.now()

  // Derive a stable account key from the EVM address (the primary signer key).
  const account = addresses?.get("EVM")

  // Reset cached data when the account changes so a previous account's
  // transactions cannot appear under the new one.
  if (account !== activeAccount) {
    clearActivityHistory()
    activeAccount = account
  }

  if (!addresses || now - lastRefreshAllTimestamp < REFRESH_INTERVAL_MS) {
    return
  }

  const token = currentAccountToken
  lastRefreshAllTimestamp = now
  activityHistoryStore.isLoading = true

  try {
    await refreshAllChains(addresses, token)
  } catch (error) {
    console.error(error)
  } finally {
    if (token === currentAccountToken) {
      activityHistoryStore.isLoading = false
    }
  }
}

const refreshAllChains = async (addresses: Addresses, token: number) => {
  const promises = getAvailableChainIds(addresses).map((chainId) =>
    refreshHistorySingleChain(addresses, chainId, token),
  )
  await Promise.allSettled(promises)
}

const refreshHistorySingleChain = async (
  addresses: Addresses,
  chainId: number,
  token: number,
) => {
  const provider = getChainProvider(chainId)
  const address = addresses.get(provider.family)
  if (!address) {
    throw new Error(`Address not found for provider: ${provider.family}`)
  }
  const externalTxsForChain = await provider.getTransactions(chainId, address)

  // Guard against late async writes: if the account changed or history was
  // cleared while the query was in flight, discard the stale response.
  if (token !== currentAccountToken || activeAccount !== addresses.get("EVM")) {
    return
  }

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
  replacePropagatingTx: replacePropagatingTx,
  removePropagatingTx: removePropagatingTx,
  getCurrentAccountToken: getCurrentAccountToken,
})
