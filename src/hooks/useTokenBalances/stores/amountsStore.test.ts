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
  beforeEach(() => {
    vi.resetAllMocks()
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
    mockGetAmounts.mockImplementationOnce(() => delayedPromiseA)
    const refreshPromiseA = refreshAmounts(tokens, addressesA, "all")

    // Account B logs in and triggers refresh, resolving immediately
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

    mockGetAmounts.mockImplementationOnce(() => delayedPromiseA)
    const refreshPromiseA = refreshAmounts(tokens, addressesA, 42220)

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
})
