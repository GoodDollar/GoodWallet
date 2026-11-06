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

type MockWalletKit = {
  on: ReturnType<typeof vi.fn>
  removeListener: ReturnType<typeof vi.fn>
  rejectSession: ReturnType<typeof vi.fn>
  approveSession: ReturnType<typeof vi.fn>
  respondSessionRequest: ReturnType<typeof vi.fn>
  getActiveSessions: ReturnType<typeof vi.fn>
  engine: {
    signClient: {
      events: {
        on: ReturnType<typeof vi.fn>
        removeListener: ReturnType<typeof vi.fn>
      }
    }
  }
}

describe("RequestHandler - Session Proposal", () => {
  let listeners: Record<string, (arg: unknown) => Promise<void>>
  let mockWalletKit: MockWalletKit
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
      getActiveSessions: vi.fn(() => ({})),
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

  it("accepts session proposal with chain-scoped namespace keys (eip155:1)", async () => {
    const onSessionProposal = listeners.session_proposal
    expect(onSessionProposal).toBeDefined()

    mockOpenDialog.mockResolvedValueOnce("accepted")

    const scopedProposal = {
      id: 99999,
      params: {
        requiredNamespaces: {
          "eip155:1": {
            methods: ["personal_sign"],
            events: [],
          },
        },
        optionalNamespaces: {},
      },
      verifyContext: {
        verified: {
          origin: "https://ethereum-dapp.com",
        },
      },
    }

    await onSessionProposal(scopedProposal)

    // Should NOT reject as UNSUPPORTED_CHAINS
    expect(mockRejectSession).not.toHaveBeenCalled()
    expect(mockOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "sessionProposal",
      }),
    )
  })

  it("rejects session request if session topic is not compatible with active signer", async () => {
    const onSessionRequest = listeners.session_request
    expect(onSessionRequest).toBeDefined()

    // Session belongs to another address
    const otherAccountSession = {
      topic: "other-topic",
      namespaces: {
        eip155: {
          accounts: ["eip155:1:0x9999999999999999999999999999999999999999"],
          methods: ["personal_sign"],
          events: [],
        },
      },
    }

    mockWalletKit.getActiveSessions = vi.fn(() => ({
      "other-topic": otherAccountSession,
    }))

    const requestEvent = {
      id: 111,
      topic: "other-topic",
      params: {
        request: {
          method: "personal_sign",
          params: ["0xhello", "0x1111111111111111111111111111111111111111"],
        },
        chainId: "eip155:1",
      },
    }

    await onSessionRequest(requestEvent)

    // Should open error dialog and reject request with USER_DISCONNECTED
    expect(mockOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
      }),
    )
    expect(mockRespondSessionRequest).toHaveBeenCalledWith({
      topic: "other-topic",
      response: expect.objectContaining({
        error: expect.objectContaining({
          message: expect.stringContaining("disconnected"),
        }),
      }),
    })
  })

  it("rejects session request if signer switches while approval dialog is open", async () => {
    let activeSigner = mockSigner
    listeners = {}
    setupListeners(() => activeSigner, mockWalletKit as never, vi.fn())
    const onSessionRequest = listeners.session_request
    expect(onSessionRequest).toBeDefined()

    const compatibleSession = {
      topic: "compatible-topic",
      namespaces: {
        eip155: {
          accounts: ["eip155:1:0x1111111111111111111111111111111111111111"],
          methods: ["personal_sign"],
          events: [],
        },
      },
    }

    mockWalletKit.getActiveSessions = vi.fn(() => ({
      "compatible-topic": compatibleSession,
    }))

    // Dialog opens, and while it is open, user switches accounts
    mockOpenDialog.mockImplementationOnce(async () => {
      activeSigner = {
        EVM: {
          address: "0x2222222222222222222222222222222222222222",
          signMessage: vi.fn(),
          signTypedData: vi.fn(),
          signTransaction: vi.fn(),
          submitTransaction: vi.fn(),
        },
      } as unknown as ISigner
      return "accepted"
    })

    const requestEvent = {
      id: 222,
      topic: "compatible-topic",
      params: {
        request: {
          method: "personal_sign",
          params: ["0xhello", "0x1111111111111111111111111111111111111111"],
        },
        chainId: "eip155:1",
      },
    }

    await onSessionRequest(requestEvent)

    // Since active signer changed to 0x2222... during approval, post-dialog check fails
    expect(mockRespondSessionRequest).toHaveBeenCalledWith({
      topic: "compatible-topic",
      response: expect.objectContaining({
        error: expect.objectContaining({
          message: expect.stringContaining("disconnected"),
        }),
      }),
    })
  })
})
