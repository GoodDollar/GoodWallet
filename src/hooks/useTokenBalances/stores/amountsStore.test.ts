import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGetAmounts = vi.fn()

vi.mock("@/config", () => ({
  config: {
    env: "development",
    walletConnectEnabled: true,
    walletConnectProjectId: "test-project-id",
  },
}))

vi.mock("@/chain/chains", () => ({
  isChainAvailableForAddresses: vi.fn(() => true),
}))

vi.mock("@/chain/provider/provider", () => ({
  getChainProvider: vi.fn(() => ({
    family: "EVM",
    getAmounts: mockGetAmounts,
  })),
  getChainProviderForFamily: vi.fn(() => ({
    family: "EVM",
    isValidAddress: vi.fn(() => true),
  })),
}))

vi.mock("./focusStore", () => ({
  focusStore: {
    isWalletInFocus: true,
  },
}))

import { FixedNumber } from "ethers"

import type { Addresses, ISigner } from "@/login"
import { sessionState } from "@/login/context/SessionContext/storage"
import type { Tokens } from "@/tokens/types"

import { NormalizedAddressMap } from "../NormalizedAddressMap"
import type { TokensOfChain } from "./amountsStore"
import { amountsStore, refreshAmounts } from "./amountsStore"

const makeAddresses = (evmAddress: string): Addresses => {
  const map = new Map<keyof ISigner, string>()
  map.set("EVM", evmAddress)
  return map
}

const makeTokens = (chainIds: number[]): Tokens => {
  const map = new Map<number, TokensOfChain>()
  for (const chainId of chainIds) {
    map.set(chainId, new Map() as unknown as TokensOfChain)
  }
  return map as unknown as Tokens
}

describe("amountsStore - late async response guard", () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    sessionState.addresses = undefined
    await refreshAmounts(undefined, undefined, "all")
    amountsStore.amounts.clear()
    amountsStore.isLoading = true
    amountsStore.isValidating = false
  })

  it("guards against late async responses from Account A overwriting Account B balances (all chains)", async () => {
    const accountA = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    const accountB = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"

    const tokens = makeTokens([42220])
    const addressesA = makeAddresses(accountA)
    const addressesB = makeAddresses(accountB)

    const amountsA = new NormalizedAddressMap<string, FixedNumber>("EVM", [
      [
        "0x1111111111111111111111111111111111111111",
        FixedNumber.fromString("100.0"),
      ],
    ])
    const amountsB = new NormalizedAddressMap<string, FixedNumber>("EVM", [
      [
        "0x1111111111111111111111111111111111111111",
        FixedNumber.fromString("200.0"),
      ],
    ])

    let resolveA: (val: unknown) => void = () => {}
    const delayedPromiseA = new Promise((resolve) => {
      resolveA = resolve
    })

    // Account A triggers refresh; its provider call hangs
    sessionState.addresses = addressesA
    mockGetAmounts.mockImplementationOnce(() => delayedPromiseA)
    const refreshPromiseA = refreshAmounts(tokens, addressesA, "all")

    // Account B logs in and triggers refresh, resolving immediately
    sessionState.addresses = addressesB
    mockGetAmounts.mockResolvedValueOnce(amountsB)
    await refreshAmounts(tokens, addressesB, "all")

    // Account B's balances are now present
    expect(amountsStore.amounts.get(42220)).toBe(amountsB)
    expect(amountsStore.isLoading).toBe(false)
    expect(amountsStore.isValidating).toBe(false)

    // Now Account A's delayed response finally resolves
    resolveA(amountsA)
    await refreshPromiseA

    // Account A's late response must NOT overwrite Account B's balances
    expect(amountsStore.amounts.get(42220)).toBe(amountsB)
    expect(amountsStore.amounts.get(42220)).not.toBe(amountsA)
  })

  it("guards against late async responses for single chain refresh", async () => {
    const accountA = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    const accountB = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"

    const tokens = makeTokens([42220])
    const addressesA = makeAddresses(accountA)
    const addressesB = makeAddresses(accountB)

    const amountsA = new NormalizedAddressMap<string, FixedNumber>("EVM", [
      [
        "0x1111111111111111111111111111111111111111",
        FixedNumber.fromString("100.0"),
      ],
    ])
    const amountsB = new NormalizedAddressMap<string, FixedNumber>("EVM", [
      [
        "0x1111111111111111111111111111111111111111",
        FixedNumber.fromString("500.0"),
      ],
    ])

    let resolveA: (val: unknown) => void = () => {}
    const delayedPromiseA = new Promise((resolve) => {
      resolveA = resolve
    })

    sessionState.addresses = addressesA
    mockGetAmounts.mockImplementationOnce(() => delayedPromiseA)
    const refreshPromiseA = refreshAmounts(tokens, addressesA, 42220)

    sessionState.addresses = addressesB
    mockGetAmounts.mockResolvedValueOnce(amountsB)
    await refreshAmounts(tokens, addressesB, 42220)

    expect(amountsStore.amounts.get(42220)).toBe(amountsB)

    resolveA(amountsA)
    await refreshPromiseA

    expect(amountsStore.amounts.get(42220)).toBe(amountsB)
    expect(amountsStore.amounts.get(42220)).not.toBe(amountsA)
  })

  it("allows concurrent refreshes on different chains to both land without dropping each other", async () => {
    const account = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    const addresses = makeAddresses(account)
    sessionState.addresses = addresses
    const tokens = makeTokens([42220, 122])

    const amountsCelo = new NormalizedAddressMap<string, FixedNumber>("EVM", [
      [
        "0x1111111111111111111111111111111111111111",
        FixedNumber.fromString("100.0"),
      ],
    ])
    const amountsFuse = new NormalizedAddressMap<string, FixedNumber>("EVM", [
      [
        "0x2222222222222222222222222222222222222222",
        FixedNumber.fromString("200.0"),
      ],
    ])

    let resolveCelo!: (val: unknown) => void
    const delayedCelo = new Promise((resolve) => {
      resolveCelo = resolve
    })

    // Chain 42220 refresh starts and hangs
    mockGetAmounts.mockImplementationOnce(() => delayedCelo)
    const refreshCelo = refreshAmounts(tokens, addresses, 42220)

    // Chain 122 refresh starts and finishes immediately
    mockGetAmounts.mockResolvedValueOnce(amountsFuse)
    await refreshAmounts(tokens, addresses, 122)

    // Chain 122 should have landed
    expect(amountsStore.amounts.get(122)).toBe(amountsFuse)

    // Now chain 42220 completes
    resolveCelo(amountsCelo)
    await refreshCelo

    // Both chains must be present; chain 42220 must not have been dropped by chain 122's refresh
    expect(amountsStore.amounts.get(42220)).toBe(amountsCelo)
    expect(amountsStore.amounts.get(122)).toBe(amountsFuse)
  })

  it("clears amounts when addresses are undefined", async () => {
    amountsStore.amounts.set(42220, new NormalizedAddressMap("EVM"))
    await refreshAmounts(undefined, undefined, "all")
    expect(amountsStore.amounts.size).toBe(0)
    expect(amountsStore.isLoading).toBe(true)
  })

  it("ignores late single-chain mutate callbacks from Account A after switching to Account B (B7)", async () => {
    const accountA = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    const accountB = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"

    const tokens = makeTokens([42220])
    const addressesA = makeAddresses(accountA)
    const addressesB = makeAddresses(accountB)

    const amountsA = new NormalizedAddressMap<string, FixedNumber>("EVM", [
      [
        "0x1111111111111111111111111111111111111111",
        FixedNumber.fromString("100.0"),
      ],
    ])
    const amountsB = new NormalizedAddressMap<string, FixedNumber>("EVM", [
      [
        "0x1111111111111111111111111111111111111111",
        FixedNumber.fromString("200.0"),
      ],
    ])

    // Account A is active initially
    sessionState.addresses = addressesA
    await new Promise((r) => setTimeout(r, 10))
    mockGetAmounts.mockResolvedValueOnce(amountsA)
    await refreshAmounts(tokens, addressesA, "all")
    expect(amountsStore.amounts.get(42220)).toBe(amountsA)

    // User switches to Account B
    sessionState.addresses = addressesB
    await new Promise((r) => setTimeout(r, 10))
    mockGetAmounts.mockResolvedValueOnce(amountsB)
    await refreshAmounts(tokens, addressesB, "all")
    expect(amountsStore.amounts.get(42220)).toBe(amountsB)

    // Account A's late mutate callback fires for chain 42220 with stale addressesA
    await refreshAmounts(tokens, addressesA, 42220)

    // Account B's balances must NOT be overwritten by Account A's late callback
    expect(amountsStore.amounts.get(42220)).toBe(amountsB)
    expect(amountsStore.amounts.get(42220)).not.toBe(amountsA)

    // Cleanup sessionState for subsequent tests
    sessionState.addresses = undefined
  })

  it("does not prematurely clear loading state when stale in-flight request resolves (B10)", async () => {
    const accountA = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    const accountB = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"

    const tokens = makeTokens([42220])
    const addressesA = makeAddresses(accountA)
    const addressesB = makeAddresses(accountB)

    let resolveA!: (val: unknown) => void
    const delayedA = new Promise((resolve) => {
      resolveA = resolve
    })
    let resolveB!: (val: unknown) => void
    const delayedB = new Promise((resolve) => {
      resolveB = resolve
    })

    // Account A starts refresh and hangs
    sessionState.addresses = addressesA
    mockGetAmounts.mockImplementationOnce(() => delayedA)
    const refreshA = refreshAmounts(tokens, addressesA, "all")

    // Account B logs in while A is in flight; B's refresh also starts and hangs
    sessionState.addresses = addressesB
    mockGetAmounts.mockImplementationOnce(() => delayedB)
    const refreshB = refreshAmounts(tokens, addressesB, "all")

    expect(amountsStore.isValidating).toBe(true)

    // Account A's stale fetch resolves
    resolveA(new NormalizedAddressMap<string, FixedNumber>("EVM"))
    await refreshA

    // Account B is still in flight, so isValidating must remain true
    expect(amountsStore.isValidating).toBe(true)

    // Account B resolves
    resolveB(new NormalizedAddressMap<string, FixedNumber>("EVM"))
    await refreshB

    expect(amountsStore.isValidating).toBe(false)
  })

  it("clears cached amounts on account change (B12)", async () => {
    const accountA = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    const accountB = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"

    const tokens = makeTokens([42220])
    const addressesA = makeAddresses(accountA)
    const addressesB = makeAddresses(accountB)

    const amountsA = new NormalizedAddressMap<string, FixedNumber>("EVM", [
      [
        "0x1111111111111111111111111111111111111111",
        FixedNumber.fromString("100.0"),
      ],
    ])

    sessionState.addresses = addressesA
    mockGetAmounts.mockResolvedValueOnce(amountsA)
    await refreshAmounts(tokens, addressesA, "all")
    expect(amountsStore.amounts.get(42220)).toBe(amountsA)

    // When switching to Account B, cached amounts must be cleared immediately
    sessionState.addresses = addressesB
    let resolveB!: (val: unknown) => void
    const delayedB = new Promise((resolve) => {
      resolveB = resolve
    })
    mockGetAmounts.mockImplementationOnce(() => delayedB)

    const refreshB = refreshAmounts(tokens, addressesB, "all")

    // Before B resolves, old amounts must already be cleared
    expect(amountsStore.amounts.get(42220)).toBeUndefined()

    resolveB(new NormalizedAddressMap<string, FixedNumber>("EVM"))
    await refreshB
  })

  it("ignores refresh callbacks from ended sessions (when session has ended / logged out)", async () => {
    const accountA = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    const tokens = makeTokens([42220])
    const addressesA = makeAddresses(accountA)

    // User is logged out (ended session)
    sessionState.addresses = undefined

    // A late claim or mutation callback fires with addressesA
    await refreshAmounts(tokens, addressesA, 42220)

    // No RPC call should be made and no amounts stored
    expect(mockGetAmounts).not.toHaveBeenCalled()
    expect(amountsStore.amounts.get(42220)).toBeUndefined()
  })
})
