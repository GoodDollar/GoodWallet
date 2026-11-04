import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../requests/RequestHandler", () => ({
  setupListeners: vi.fn(),
}))

const { mockDisconnectSession } = vi.hoisted(() => ({
  mockDisconnectSession: vi.fn().mockResolvedValue(undefined),
}))

import type WalletKit from "@reown/walletkit"
import type { SessionTypes } from "@walletconnect/types"

import type { ISigner } from "@/login/types"

import {
  disconnectIncompatibleSessions,
  isSessionCompatibleWithSigner,
} from "./walletConnectStore"

describe("walletConnectStore - session compatibility and isolation", () => {
  const evmAddressA = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  const evmAddressB = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"

  const signerA = {
    EVM: {
      address: evmAddressA,
    },
  } as unknown as ISigner

  const signerB = {
    EVM: {
      address: evmAddressB,
    },
  } as unknown as ISigner

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("considers an EVM session compatible only if its account matches the active signer", () => {
    const sessionForA = {
      topic: "topic-a",
      namespaces: {
        eip155: {
          accounts: [`eip155:1:${evmAddressA}`, `eip155:42220:${evmAddressA}`],
          methods: ["eth_sendTransaction"],
          events: [],
        },
      },
    } as unknown as SessionTypes.Struct

    expect(isSessionCompatibleWithSigner(sessionForA, signerA)).toBe(true)
    expect(isSessionCompatibleWithSigner(sessionForA, signerB)).toBe(false)
  })

  it("rejects non-EVM sessions for an EVM-only external signer", () => {
    const solanaSession = {
      topic: "topic-sol",
      namespaces: {
        solana: {
          accounts: ["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:SomeSolAddress"],
          methods: ["solana_signTransaction"],
          events: [],
        },
      },
    } as unknown as SessionTypes.Struct

    expect(isSessionCompatibleWithSigner(solanaSession, signerA)).toBe(false)
  })

  it("disconnects incompatible restored sessions so they do not silently rebind to a new signer", async () => {
    const sessionForA = {
      topic: "topic-a",
      namespaces: {
        eip155: {
          accounts: [`eip155:1:${evmAddressA}`],
          methods: ["eth_sendTransaction"],
          events: [],
        },
      },
    } as unknown as SessionTypes.Struct

    const sessionForB = {
      topic: "topic-b",
      namespaces: {
        eip155: {
          accounts: [`eip155:1:${evmAddressB}`],
          methods: ["eth_sendTransaction"],
          events: [],
        },
      },
    } as unknown as SessionTypes.Struct

    const mockWallet = {
      getActiveSessions: () => ({
        "topic-a": sessionForA,
        "topic-b": sessionForB,
      }),
      disconnectSession: mockDisconnectSession,
    } as unknown as WalletKit

    // When signer B logs in, session A must be disconnected; session B is retained
    await disconnectIncompatibleSessions(mockWallet, signerB)

    expect(mockDisconnectSession).toHaveBeenCalledTimes(1)
    expect(mockDisconnectSession).toHaveBeenCalledWith({
      topic: "topic-a",
      reason: expect.objectContaining({
        message: expect.stringContaining("User disconnected"),
      }),
    })
  })
})
