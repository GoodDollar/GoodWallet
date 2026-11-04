import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  mockSubscribeAccount,
  mockGetAddress,
  mockGetChainId,
  mockSwitchNetwork,
  mockGetProvider,
} = vi.hoisted(() => ({
  mockSubscribeAccount: vi.fn(),
  mockGetAddress: vi.fn(),
  mockGetChainId: vi.fn(),
  mockSwitchNetwork: vi.fn(),
  mockGetProvider: vi.fn(),
}))

vi.mock("@reown/appkit", () => ({
  createAppKit: vi.fn(() => ({
    ready: vi.fn().mockResolvedValue(undefined),
    subscribeAccount: mockSubscribeAccount,
    subscribeState: vi.fn(),
    getAddress: mockGetAddress,
    getChainId: mockGetChainId,
    switchNetwork: mockSwitchNetwork,
    getProvider: mockGetProvider,
  })),
}))

vi.mock("@reown/appkit-adapter-ethers", () => ({
  EthersAdapter: vi.fn(),
}))

vi.mock("@/chain/chains", () => ({
  AVAILABLE_EVM_CHAINS: new Map([
    [
      42220,
      {
        id: 42220,
        name: "Celo",
        nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
        rpcUrls: { default: { http: ["https://rpc.celo.org"] } },
      },
    ],
    [
      122,
      {
        id: 122,
        name: "Fuse",
        nativeCurrency: { name: "FUSE", symbol: "FUSE", decimals: 18 },
        rpcUrls: { default: { http: ["https://rpc.fuse.io"] } },
      },
    ],
  ]),
}))

vi.mock("../../config", () => ({
  config: {
    walletConnectEnabled: true,
    walletConnectProjectId: "test-project-id",
  },
}))

import { getReownSession, watchReownAccount } from "./reown"

describe("reown - coordinated switching and account monitoring", () => {
  const address = "0x1111111111111111111111111111111111111111"

  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal("window", {
      location: { origin: "http://localhost:3000" },
    })
    mockGetAddress.mockReturnValue(address)
    mockGetProvider.mockReturnValue({
      request: vi.fn(),
    })
    mockGetChainId.mockReturnValue(42220)
  })

  describe("watchReownAccount", () => {
    type AccountState = {
      isConnected: boolean
      address?: string
      status: string
    }

    it("notifies onAccountChanged when account address changes", async () => {
      let accountCallback: (state: AccountState) => void = () => {}
      mockSubscribeAccount.mockImplementation(
        (cb: (state: AccountState) => void) => {
          accountCallback = cb
          return vi.fn()
        },
      )

      // Initialize AppKit instance via getReownSession first
      await getReownSession("direct", "existing_wallet", {
        interactive: false,
        expectedAddress: address,
      })

      const onAccountChanged = vi.fn()
      const onDisconnected = vi.fn()

      watchReownAccount(address, onAccountChanged, onDisconnected)

      // Simulate account address change
      accountCallback({
        isConnected: true,
        address: "0x2222222222222222222222222222222222222222",
        status: "connected",
      })

      expect(onAccountChanged).toHaveBeenCalledTimes(1)
      expect(onDisconnected).not.toHaveBeenCalled()
    })

    it("notifies onDisconnected without triggering accountChanged when wallet disconnects", async () => {
      let accountCallback: (state: AccountState) => void = () => {}
      mockSubscribeAccount.mockImplementation(
        (cb: (state: AccountState) => void) => {
          accountCallback = cb
          return vi.fn()
        },
      )

      // Initialize AppKit instance via getReownSession first
      await getReownSession("direct", "existing_wallet", {
        interactive: false,
        expectedAddress: address,
      })

      const onAccountChanged = vi.fn()
      const onDisconnected = vi.fn()

      watchReownAccount(address, onAccountChanged, onDisconnected)

      // Simulate external wallet disconnect
      accountCallback({
        isConnected: false,
        address: undefined,
        status: "disconnected",
      })

      expect(onDisconnected).toHaveBeenCalledTimes(1)
      expect(onAccountChanged).not.toHaveBeenCalled()
    })
  })

  describe("coordinated network switching", () => {
    it("releases the queue when a chain switch fails so subsequent operations can proceed", async () => {
      const session = await getReownSession("direct", "existing_wallet", {
        interactive: false,
        expectedAddress: address,
      })

      // First call: switch to Fuse (122), but user rejects switch
      mockSwitchNetwork.mockRejectedValueOnce(
        new Error("User rejected chain switch"),
      )

      expect(session.signer.EVM.submitTransaction).toBeDefined()

      await expect(
        session.signer.EVM.submitTransaction?.({
          chainId: 122,
          to: "0xrecipient",
          value: BigInt(0),
        }),
      ).rejects.toThrow("User rejected chain switch")

      // Second call: now switch to Celo (42220) which succeeds
      // If the queue was not released in finally, this would hang forever!
      mockSwitchNetwork.mockResolvedValueOnce(undefined)
      mockGetChainId.mockReturnValue(42220)

      // Mock signer sendUncheckedTransaction
      const { BrowserProvider } = await import("ethers")
      const mockSigner = {
        sendUncheckedTransaction: vi.fn().mockResolvedValue("0xsuccesshash"),
      }
      vi.spyOn(BrowserProvider.prototype, "getSigner").mockResolvedValue(
        mockSigner as never,
      )

      const hash = await session.signer.EVM.submitTransaction?.({
        chainId: 42220,
        to: "0xrecipient",
        value: BigInt(0),
      })

      expect(hash).toBe("0xsuccesshash")
    })

    it("serializes signMessage so it cannot interleave with an in-progress submitTransaction", async () => {
      const session = await getReownSession("direct", "existing_wallet", {
        interactive: false,
        expectedAddress: address,
      })

      const executionOrder: string[] = []
      let resolveSubmit: () => void = () => {}
      const submitInFlight = new Promise<void>((resolve) => {
        resolveSubmit = resolve
      })

      const { BrowserProvider } = await import("ethers")
      const mockSigner = {
        sendUncheckedTransaction: vi.fn(async () => {
          executionOrder.push("submit_started")
          await submitInFlight
          executionOrder.push("submit_finished")
          return "0xhash"
        }),
        signMessage: vi.fn(async () => {
          executionOrder.push("sign_message")
          return "0xsignature"
        }),
      }
      vi.spyOn(BrowserProvider.prototype, "getSigner").mockResolvedValue(
        mockSigner as never,
      )

      mockSwitchNetwork.mockResolvedValue(undefined)
      mockGetChainId.mockReturnValue(42220)

      // 1. Start submitTransaction (it acquires the lock and waits on submitInFlight)
      const submitPromise = session.signer.EVM.submitTransaction?.({
        chainId: 42220,
        to: "0xrecipient",
        value: BigInt(0),
      })

      // 2. Concurrently call signMessage while submitTransaction holds the lock
      const signMessagePromise =
        session.signer.EVM.signMessage?.("test-payload")

      // Give event loop ticks to confirm signMessage cannot proceed while submit holds lock
      await new Promise((r) => setTimeout(r, 50))
      expect(executionOrder).toEqual(["submit_started"])
      expect(mockSigner.signMessage).not.toHaveBeenCalled()

      // 3. Complete the in-flight submission
      resolveSubmit()
      await submitPromise
      const signature = await signMessagePromise

      // 4. Verify signMessage executed strictly after submitTransaction finished
      expect(executionOrder).toEqual([
        "submit_started",
        "submit_finished",
        "sign_message",
      ])
      expect(signature).toBe("0xsignature")
    })
  })
})
