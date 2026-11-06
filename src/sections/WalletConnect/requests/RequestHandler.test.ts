import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  mockOpenDialog,
  mockCaptureEvent,
  mockRejectSession,
  mockApproveSession,
  mockRespondSessionRequest,
} = vi.hoisted(() => ({
  mockOpenDialog: vi.fn(),
  mockCaptureEvent: vi.fn(),
  mockRejectSession: vi.fn().mockResolvedValue(undefined),
  mockApproveSession: vi.fn().mockResolvedValue(undefined),
  mockRespondSessionRequest: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/chain/chains", () => {
  const celoChain = { id: 42220, name: "Celo", family: "EVM" }
  const ethChain = { id: 1, name: "Ethereum", family: "EVM" }
  return {
    AVAILABLE_CHAINS_IDS: [42220, 1],
    AVAILABLE_EVM_CHAINS: new Map([
      [42220, celoChain],
      [1, ethChain],
    ]),
    AVAILABLE_CHAINS: new Map([
      [42220, celoChain],
      [1, ethChain],
    ]),
  }
})

vi.mock("./SolanaRequestHandlerUtil", () => ({
  approveSolanaRequest: vi.fn(),
}))

vi.mock("./BIP122RequestHandlerUtil", () => ({
  approveBIP122Request: vi.fn(),
}))

vi.mock("./EIP155RequestHandlerUtil", () => ({
  approveEIP155Request: vi.fn(),
}))

vi.mock("./EIP5792RequestHandlerUtil", () => ({
  approveEIP5792Request: vi.fn(),
}))

vi.mock("@/chain/provider/provider", () => ({
  getChainProvider: vi.fn(),
}))

vi.mock("@/analytics/useAnalytics", () => ({
  captureEvent: mockCaptureEvent,
}))

vi.mock("../store/walletConnectDialogStore", () => ({
  openWalletConnectDialog: mockOpenDialog,
}))

vi.mock("@/utils/reownAppKitWrapper", () => ({
  getCloseAfterWCAction: () => false,
}))

import type { ISigner } from "@/login/types"

import { setupListeners } from "./RequestHandler"

describe("RequestHandler - Session Proposal", () => {
  let listeners: Record<string, (arg: unknown) => Promise<void>>
  let mockWalletKit: unknown
  let mockSigner: ISigner

  beforeEach(() => {
    vi.resetAllMocks()
    listeners = {}

    mockWalletKit = {
      on: vi.fn((event: string, handler: (arg: unknown) => Promise<void>) => {
        listeners[event] = handler
      }),
      removeListener: vi.fn(),
      rejectSession: mockRejectSession,
      approveSession: mockApproveSession,
      respondSessionRequest: mockRespondSessionRequest,
      engine: {
        signClient: {
          events: {
            on: vi.fn(),
            removeListener: vi.fn(),
          },
        },
      },
    }

    // External EVM wallet: has EVM with submitTransaction, but NO solana/BTC
    mockSigner = {
      EVM: {
        address: "0x1111111111111111111111111111111111111111",
        signMessage: vi.fn(),
        signTypedData: vi.fn(),
        signTransaction: vi.fn(),
        submitTransaction: vi.fn(),
      },
    } as unknown as ISigner

    setupListeners(() => mockSigner, mockWalletKit as never, vi.fn())
  })

  it("rejects session proposal with UNSUPPORTED_CHAINS when required chains are not supported", async () => {
    const onSessionProposal = listeners.session_proposal
    expect(onSessionProposal).toBeDefined()

    // Proposal requesting an unsupported chain (e.g. Solana or Bitcoin for EVM-only wallet)
    const unsupportedProposal = {
      id: 12345,
      params: {
        requiredNamespaces: {
          solana: {
            chains: ["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"],
            methods: ["solana_signTransaction"],
            events: [],
          },
        },
        optionalNamespaces: {},
      },
      verifyContext: {
        verified: {
          origin: "https://solana-dapp.com",
        },
      },
    }

    await onSessionProposal(unsupportedProposal)

    // Verify error dialog was shown
    expect(mockOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
      }),
    )

    // Verify rejectSession was called with UNSUPPORTED_CHAINS error so dApp does not hang
    expect(mockRejectSession).toHaveBeenCalledWith({
      id: 12345,
      reason: expect.objectContaining({
        message: expect.stringContaining("Unsupported"),
      }),
    })
  })

  it("rejects session proposal with UNSUPPORTED_METHODS when required methods are not supported", async () => {
    const onSessionProposal = listeners.session_proposal
    expect(onSessionProposal).toBeDefined()

    // Proposal requesting an unsupported method for external wallet (e.g. eth_signTransaction)
    const unsupportedProposal = {
      id: 54321,
      params: {
        requiredNamespaces: {
          eip155: {
            chains: ["eip155:42220"],
            methods: ["eth_signTransaction"],
            events: [],
          },
        },
        optionalNamespaces: {},
      },
      verifyContext: {
        verified: {
          origin: "https://evm-dapp.com",
        },
      },
    }

    await onSessionProposal(unsupportedProposal)

    // Verify error dialog was shown with unsupported methods
    expect(mockOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        errorText: expect.stringContaining("eth_signTransaction"),
      }),
    )

    // Verify rejectSession was called with UNSUPPORTED_METHODS error so dApp does not hang
    expect(mockRejectSession).toHaveBeenCalledWith({
      id: 54321,
      reason: expect.objectContaining({
        code: 5101,
        message: expect.stringContaining("Unsupported methods"),
      }),
    })

    // Dialog was not opened for approval
    expect(mockOpenDialog).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: "sessionProposal",
      }),
    )
  })
})
