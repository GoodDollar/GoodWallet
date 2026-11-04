import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../requests/RequestHandler", () => ({
  setupListeners: vi.fn(),
}))

vi.mock("@/config", () => ({
  config: {
    walletConnectEnabled: true,
    walletConnectProjectId: "test-project-id",
  },
}))

vi.mock("@walletconnect/core", () => ({
  Core: vi.fn(),
}))

vi.mock("@/utils/reownAppKitWrapper", () => ({
  getWCUri: vi.fn(() => undefined),
}))

const { mockWalletKitInit, mockDisconnectSession } = vi.hoisted(() => ({
  mockWalletKitInit: vi.fn(),
  mockDisconnectSession: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@reown/walletkit", () => ({
  default: {
    init: mockWalletKitInit,
  },
}))

import type WalletKit from "@reown/walletkit"
import type { SessionTypes } from "@walletconnect/types"

import type { ISigner } from "@/login/types"

import {
  disconnectIncompatibleSessions,
  isSessionCompatibleWithSigner,
  walletConnectState,
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

  const sessionForB = {
    topic: "topic-b",
    namespaces: {
      eip155: {
        accounts: [`eip155:1:${evmAddressB}`, `eip155:42220:${evmAddressB}`],
        methods: ["eth_sendTransaction"],
        events: [],
      },
    },
  } as unknown as SessionTypes.Struct

  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal("window", {
      location: { origin: "http://localhost:3000" },
    })
    vi.stubGlobal("sessionStorage", {
      setItem: vi.fn(),
      getItem: vi.fn(),
    })
    walletConnectState.walletConnectInstance = undefined
    walletConnectState.sessions = []
  })

  it("considers an EVM session compatible only if its account matches the active signer", () => {
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

  it("disconnects incompatible restored sessions so they do not silently rebind to a new signer (helper)", async () => {
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

  it("disconnects incompatible restored sessions during initializeWalletConnect integration", async () => {
    const activeSessions: Record<string, SessionTypes.Struct> = {
      "topic-a": sessionForA,
      "topic-b": sessionForB,
    }
    const mockWallet = {
      getActiveSessions: vi.fn(() => ({ ...activeSessions })),
      disconnectSession: vi.fn(
        async (args: { topic: string; reason: unknown }) => {
          delete activeSessions[args.topic]
          await mockDisconnectSession(args)
        },
      ),
      pair: vi.fn(),
    }
    mockWalletKitInit.mockResolvedValueOnce(mockWallet)

    // Account B logs in and initializes WalletConnect
    await walletConnectState.initializeWalletConnect(signerB)

    // Integration check: initializeWalletConnect must prune Account A's session
    expect(mockDisconnectSession).toHaveBeenCalledTimes(1)
    expect(mockDisconnectSession).toHaveBeenCalledWith({
      topic: "topic-a",
      reason: expect.objectContaining({
        message: expect.stringContaining("User disconnected"),
      }),
    })
    // And retained sessions should only be Account B's
    expect(walletConnectState.sessions).toEqual([sessionForB])
  })
})
