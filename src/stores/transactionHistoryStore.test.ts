import { beforeEach, describe, expect, it, vi } from "vitest"

import { type Tx, TxDirection } from "@/hooks/useLedger/types"
import type { Addresses, ISigner } from "@/login"

const mockGetTransactions = vi.fn()

vi.mock("@/chain/chains", () => ({
  getAvailableChainIds: vi.fn(() => [42220]),
}))

vi.mock("@/chain/provider/provider", () => ({
  getChainProvider: vi.fn(() => ({
    family: "EVM",
    getTransactions: mockGetTransactions,
  })),
}))

import {
  activityHistoryStore,
  clearActivityHistory,
  initActivityAccount,
} from "./transactionHistoryStore"

const makeAddresses = (evmAddress: string): Addresses => {
  const map = new Map<keyof ISigner, string>()
  map.set("EVM", evmAddress)
  return map
}

const mockTx = (hash: string, timestamp: number): Tx => ({
  hash,
  chainId: 42220,
  timestamp,
  txDirection: TxDirection.OUTGOING,
  amount: "1.0",
  tokenAddress: "0x0000000000000000000000000000000000000000",
  to: "0xrecipient",
  from: "0xsender",
})

describe("transactionHistoryStore", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetTransactions.mockResolvedValue([])
    clearActivityHistory()
  })

  it("isolates history per account and refreshes when active account changes", async () => {
    const accountA = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    const accountB = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"

    const txA = mockTx("0xtxA", 1000)
    mockGetTransactions.mockResolvedValueOnce([txA])

    // Fetch history for Account A
    await activityHistoryStore.refreshHistory(makeAddresses(accountA))
    expect(activityHistoryStore.perChain.get(42220)).toEqual([txA])

    // Switch to Account B within 10-minute window
    const txB = mockTx("0xtxB", 2000)
    mockGetTransactions.mockResolvedValueOnce([txB])

    await activityHistoryStore.refreshHistory(makeAddresses(accountB))

    // Account B must see Account B's history, not Account A's
    const historyB = activityHistoryStore.perChain.get(42220)
    expect(historyB).toEqual([txB])
    expect(historyB?.some((tx) => tx.hash === "0xtxA")).toBe(false)
  })

  it("clears cached history and propagating transactions on clearActivityHistory", async () => {
    const account = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    const tx = mockTx("0xtx1", 1000)
    mockGetTransactions.mockResolvedValueOnce([tx])

    await activityHistoryStore.refreshHistory(makeAddresses(account))
    expect(activityHistoryStore.perChain.get(42220)?.length).toBe(1)

    // Add propagating tx
    const propagatingTx = mockTx("0xpropagating", 1500)
    activityHistoryStore.addPropagatingTx(
      propagatingTx,
      activityHistoryStore.getCurrentAccountToken(),
    )
    expect(activityHistoryStore.perChain.get(42220)?.length).toBe(2)

    clearActivityHistory()

    expect(activityHistoryStore.perChain.get(42220)).toBeUndefined()

    // Re-authenticating with the same account must treat it as fresh
    const tx2 = mockTx("0xtx2", 2000)
    mockGetTransactions.mockResolvedValueOnce([tx2])
    await activityHistoryStore.refreshHistory(makeAddresses(account))
    expect(activityHistoryStore.perChain.get(42220)).toEqual([tx2])
  })

  it("guards against late async responses from Account A writing into Account B UI", async () => {
    const accountA = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    const accountB = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"

    let resolveAccountA: (txs: Tx[]) => void = () => {}
    const accountAPromise = new Promise<Tx[]>((resolve) => {
      resolveAccountA = resolve
    })

    // Account A triggers refresh with delayed response
    mockGetTransactions.mockImplementationOnce(() => accountAPromise)
    const refreshAPromise = activityHistoryStore.refreshHistory(
      makeAddresses(accountA),
    )

    // While Account A's query is in flight, Account B logs in
    const txB = mockTx("0xtxB", 2000)
    mockGetTransactions.mockResolvedValueOnce([txB])
    await activityHistoryStore.refreshHistory(makeAddresses(accountB))

    expect(activityHistoryStore.perChain.get(42220)).toEqual([txB])

    // Now Account A's delayed response finally resolves
    const txA = mockTx("0xtxA", 1000)
    resolveAccountA([txA])
    await refreshAPromise

    // Account A's late response must NOT overwrite or contaminate Account B's store
    const currentTxs = activityHistoryStore.perChain.get(42220)
    expect(currentTxs).toEqual([txB])
    expect(currentTxs?.some((tx) => tx.hash === "0xtxA")).toBe(false)
  })

  it("guards addPropagatingTx against late writes after account switch (B8)", async () => {
    const accountA = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    const accountB = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"

    // Account A is active
    await activityHistoryStore.refreshHistory(makeAddresses(accountA))
    const tokenA = activityHistoryStore.getCurrentAccountToken()

    // Switch active account to Account B
    const txB = mockTx("0xtxB", 2000)
    mockGetTransactions.mockResolvedValueOnce([txB])
    await activityHistoryStore.refreshHistory(makeAddresses(accountB))

    // Account A's claim/operation finishes late and attempts to insert propagating tx
    const claimTxA = mockTx("0xclaimA", 1500)
    activityHistoryStore.addPropagatingTx(claimTxA, tokenA)

    // Account A's transaction must NOT be added to Account B's history
    const historyB = activityHistoryStore.perChain.get(42220)
    expect(historyB).toEqual([txB])
    expect(historyB?.some((tx) => tx.hash === "0xclaimA")).toBe(false)
  })

  it("allows addPropagatingTx when account has not changed (same session)", async () => {
    const accountA = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

    // Account A is active
    await activityHistoryStore.refreshHistory(makeAddresses(accountA))
    const tokenA = activityHistoryStore.getCurrentAccountToken()

    // Same session: propagating tx is added
    const claimTxA = mockTx("0xclaimA", 1500)
    activityHistoryStore.addPropagatingTx(claimTxA, tokenA)

    const historyA = activityHistoryStore.perChain.get(42220)
    expect(historyA?.some((tx) => tx.hash === "0xclaimA")).toBe(true)
  })

  it("records replacement hash in propagating transaction (R1)", async () => {
    const account = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

    await activityHistoryStore.refreshHistory(makeAddresses(account))
    const token = activityHistoryStore.getCurrentAccountToken()

    // Propagating tx with replacement hash from speed-up
    const replacementTx = mockTx("0xreplacementhash", 1600)
    activityHistoryStore.addPropagatingTx(replacementTx, token)

    const history = activityHistoryStore.perChain.get(42220)
    expect(history?.some((tx) => tx.hash === "0xreplacementhash")).toBe(true)
  })

  it("replaces propagating transaction hash on speed-up and drops stale entries", async () => {
    const account = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    initActivityAccount(account)
    const token = activityHistoryStore.getCurrentAccountToken()

    const initialTx = mockTx("0xinitialhash", 1600)
    activityHistoryStore.addPropagatingTx(initialTx, token)
    expect(
      activityHistoryStore.perChain
        .get(42220)
        ?.some((tx) => tx.hash === "0xinitialhash"),
    ).toBe(true)

    // Reconcile with replacement hash
    activityHistoryStore.replacePropagatingTx(
      42220,
      "0xinitialhash",
      "0xspeeduphash",
      token,
    )

    const updated = activityHistoryStore.perChain.get(42220)
    expect(updated?.some((tx) => tx.hash === "0xspeeduphash")).toBe(true)
    expect(updated?.some((tx) => tx.hash === "0xinitialhash")).toBe(false)
  })

  it("removes propagating transaction on cancellation or failure", async () => {
    const account = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    initActivityAccount(account)
    const token = activityHistoryStore.getCurrentAccountToken()

    const initialTx = mockTx("0xcancelledhash", 1600)
    activityHistoryStore.addPropagatingTx(initialTx, token)
    expect(
      activityHistoryStore.perChain
        .get(42220)
        ?.some((tx) => tx.hash === "0xcancelledhash"),
    ).toBe(true)

    activityHistoryStore.removePropagatingTx(42220, "0xcancelledhash", token)

    const updated = activityHistoryStore.perChain.get(42220)
    expect(updated?.some((tx) => tx.hash === "0xcancelledhash")).toBe(false)
  })

  it("initializes account token on session start without invalidating same-session operations", async () => {
    const account = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

    // Session starts: initActivityAccount called
    initActivityAccount(account)
    const initialToken = activityHistoryStore.getCurrentAccountToken()

    // Immediate operation on Crypto tab before Activity tab opened
    const immediateTx = mockTx("0ximmediate", 1500)
    activityHistoryStore.addPropagatingTx(immediateTx, initialToken)

    expect(
      activityHistoryStore.perChain
        .get(42220)
        ?.some((tx) => tx.hash === "0ximmediate"),
    ).toBe(true)

    // Activity tab mounts and calls refreshHistory
    await activityHistoryStore.refreshHistory(makeAddresses(account))

    // Token must not be invalidated and immediate transaction must not be cleared
    expect(activityHistoryStore.getCurrentAccountToken()).toBe(initialToken)
    expect(
      activityHistoryStore.perChain
        .get(42220)
        ?.some((tx) => tx.hash === "0ximmediate"),
    ).toBe(true)
  })
})
