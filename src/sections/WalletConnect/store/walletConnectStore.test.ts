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

import { BIP122_MAINNET_CAIP2, BIP122_TESTNET_CAIP2 } from "../data/BIP122Data"
import { SOLANA_DEVNET, SOLANA_MAINNET } from "../data/SolanaData"
import {
  disconnectIncompatibleSessions,
  getActiveSigner,
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

  it("rejects restored sessions with methods unsupported by the signer (M8)", async () => {
    const externalSigner = {
      EVM: {
        address: evmAddressA,
        submitTransaction: vi.fn(),
      },
    } as unknown as ISigner

    const sessionWithRawSign = {
      topic: "topic-raw-sign",
      namespaces: {
        eip155: {
          accounts: [`eip155:1:${evmAddressA}`],
          methods: ["eth_signTransaction"],
          events: [],
        },
      },
    } as unknown as SessionTypes.Struct

    const sessionWithSupportedMethods = {
      topic: "topic-supported-methods",
      namespaces: {
        eip155: {
          accounts: [`eip155:1:${evmAddressA}`],
          methods: ["eth_sendTransaction", "personal_sign"],
          events: [],
        },
      },
    } as unknown as SessionTypes.Struct

    expect(
      isSessionCompatibleWithSigner(sessionWithRawSign, externalSigner),
    ).toBe(false)
    expect(
      isSessionCompatibleWithSigner(
        sessionWithSupportedMethods,
        externalSigner,
      ),
    ).toBe(true)

    const mockWallet = {
      getActiveSessions: () => ({
        "topic-raw-sign": sessionWithRawSign,
        "topic-supported-methods": sessionWithSupportedMethods,
      }),
      disconnectSession: mockDisconnectSession,
    } as unknown as WalletKit

    await disconnectIncompatibleSessions(mockWallet, externalSigner)

    expect(mockDisconnectSession).toHaveBeenCalledWith({
      topic: "topic-raw-sign",
      reason: expect.objectContaining({
        message: expect.stringContaining("User disconnected"),
      }),
    })
    expect(mockDisconnectSession).not.toHaveBeenCalledWith(
      expect.objectContaining({ topic: "topic-supported-methods" }),
    )
  })

  it("prefers the matching-network address for Bitcoin and Solana testnets (M9)", () => {
    const multiChainSigner = {
      EVM: { address: evmAddressA },
      BTC: { address: "1MainnetBtcAddress" },
      BTC_TESTNET: { address: "tb1qTestnetBtcAddress" },
      SOLANA: { address: "MainnetSolAddress" },
      SOLANA_DEVNET: { address: "DevnetSolAddress" },
    } as unknown as ISigner

    const btcTestnetSession = {
      topic: "topic-btc-testnet",
      namespaces: {
        bip122: {
          accounts: [`${BIP122_TESTNET_CAIP2}:tb1qTestnetBtcAddress`],
          methods: ["signPsbt"],
          events: [],
        },
      },
    } as unknown as SessionTypes.Struct

    const btcMainnetSession = {
      topic: "topic-btc-mainnet",
      namespaces: {
        bip122: {
          accounts: [`${BIP122_MAINNET_CAIP2}:1MainnetBtcAddress`],
          methods: ["signPsbt"],
          events: [],
        },
      },
    } as unknown as SessionTypes.Struct

    const solDevnetSession = {
      topic: "topic-sol-devnet",
      namespaces: {
        solana: {
          accounts: [`${SOLANA_DEVNET}:DevnetSolAddress`],
          methods: ["solana_signTransaction"],
          events: [],
        },
      },
    } as unknown as SessionTypes.Struct

    const solMainnetSession = {
      topic: "topic-sol-mainnet",
      namespaces: {
        solana: {
          accounts: [`${SOLANA_MAINNET}:MainnetSolAddress`],
          methods: ["solana_signTransaction"],
          events: [],
        },
      },
    } as unknown as SessionTypes.Struct

    expect(
      isSessionCompatibleWithSigner(btcTestnetSession, multiChainSigner),
    ).toBe(true)
    expect(
      isSessionCompatibleWithSigner(btcMainnetSession, multiChainSigner),
    ).toBe(true)
    expect(
      isSessionCompatibleWithSigner(solDevnetSession, multiChainSigner),
    ).toBe(true)
    expect(
      isSessionCompatibleWithSigner(solMainnetSession, multiChainSigner),
    ).toBe(true)

    const btcWrongTestnetSession = {
      topic: "topic-btc-wrong-testnet",
      namespaces: {
        bip122: {
          accounts: [`${BIP122_TESTNET_CAIP2}:wrongAddress`],
          methods: ["signPsbt"],
          events: [],
        },
      },
    } as unknown as SessionTypes.Struct
    expect(
      isSessionCompatibleWithSigner(btcWrongTestnetSession, multiChainSigner),
    ).toBe(false)
  })

  it("does not expose the new signer before incompatible sessions are pruned (B9)", async () => {
    let resolvePruning!: () => void
    const pruningPromise = new Promise<void>((resolve) => {
      resolvePruning = resolve
    })

    const mockWallet = {
      getActiveSessions: () => ({
        "topic-a": sessionForA,
      }),
      disconnectSession: vi.fn(async () => {
        await pruningPromise
      }),
      pair: vi.fn(),
    }
    mockWalletKitInit.mockResolvedValueOnce(mockWallet)

    // Start initialization for signerB while signerA sessions are present
    const initPromise = walletConnectState.initializeWalletConnect(signerB)

    // Yield to let initialization proceed up to the pruning step
    await new Promise((r) => setTimeout(r, 0))

    // During pruning, getActiveSigner must NOT expose signerB and must throw
    expect(() => getActiveSigner()).toThrow("No active wallet session")

    // Once pruning completes, getActiveSigner returns signerB
    resolvePruning()
    await initPromise

    expect(getActiveSigner()).toBe(signerB)
  })

  it("normalizes chain-scoped namespace keys in restored session compatibility (B11)", () => {
    // Session uses chain-scoped namespace key "eip155:1"
    const chainScopedSession = {
      topic: "topic-scoped",
      namespaces: {
        "eip155:1": {
          accounts: [`eip155:1:${evmAddressA}`],
          methods: ["eth_sendTransaction"],
          events: [],
        },
      },
    } as unknown as SessionTypes.Struct

    expect(isSessionCompatibleWithSigner(chainScopedSession, signerA)).toBe(
      true,
    )
    expect(isSessionCompatibleWithSigner(chainScopedSession, signerB)).toBe(
      false,
    )
  })

  it("rejects restored EVM sessions requesting unsupported chains (B13)", () => {
    // Session uses an unsupported EVM chain ID 999
    const unsupportedChainSession = {
      topic: "topic-unsupported-chain",
      namespaces: {
        eip155: {
          accounts: [`eip155:999:${evmAddressA}`],
          methods: ["eth_sendTransaction"],
          events: [],
        },
      },
    } as unknown as SessionTypes.Struct

    expect(
      isSessionCompatibleWithSigner(unsupportedChainSession, signerA),
    ).toBe(false)
  })
})
