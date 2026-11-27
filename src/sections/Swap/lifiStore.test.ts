import { proxy, ref } from "valtio"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { ISignerSession } from "@/login/types"

const { createClient, bitcoinProvider, connect } = vi.hoisted(() => ({
  createClient: vi.fn(),
  bitcoinProvider: vi.fn(),
  connect: vi.fn(),
}))

vi.mock("@/config", () => ({
  config: { lifiConfig: {}, rpcUrls: {}, solanaRpcsUrls: {} },
}))
vi.mock("@/login/context/SessionContext/storage", () => ({
  sessionState: proxy<{ session: ISignerSession | null }>({ session: null }),
}))
vi.mock("@/login/reown", () => ({ getReownEip1193Provider: vi.fn() }))
vi.mock("@bigmi/client", () => ({
  createConfig: () => ({ connectors: [{ connect }] }),
}))
vi.mock("@bigmi/core", () => ({
  bitcoin: {},
  createClient: vi.fn(),
  http: vi.fn(),
}))
vi.mock("./adapters/bitcoinWalletAdapter", () => ({ bitcoinAdapter: vi.fn() }))
vi.mock("./adapters/solanaWalletAdapter", () => ({
  createSolanaWallet: vi.fn(),
}))
vi.mock("./adapters/viemWalletAdapter", () => ({ getViemAccount: vi.fn() }))
vi.mock("@lifi/sdk", () => ({ createClient }))
vi.mock("@lifi/sdk-provider-ethereum", () => ({ EthereumProvider: vi.fn() }))
vi.mock("@lifi/sdk-provider-solana", () => ({ SolanaProvider: vi.fn() }))
vi.mock("@lifi/sdk-provider-bitcoin", () => ({
  BitcoinProvider: bitcoinProvider,
}))

import { sessionState } from "@/login/context/SessionContext/storage"

import { lifiState } from "./lifiStore"

const session = (withBitcoin: boolean): ISignerSession =>
  ref({
    type: "BROWSER",
    sessionOrigin: "direct",
    signer: {
      EVM: {
        address: "0x1111111111111111111111111111111111111111",
        signMessage: vi.fn(),
        signTypedData: vi.fn(),
        signTransaction: vi.fn(),
        submitTransaction: vi.fn(),
      },
      ...(withBitcoin && {
        BTC: { address: "bc1test", publicKey: "test", signPsbt: vi.fn() },
      }),
    },
  })

describe("LI.FI session initialization", () => {
  afterEach(() => {
    sessionState.session = null
    vi.resetAllMocks()
  })

  it.each([
    "success",
    "error",
  ])("ignores a superseded initialization whose old path would finish with %s", async (outcome) => {
    const started = Promise.withResolvers<void>()
    const complete = Promise.withResolvers<void>()
    connect.mockImplementationOnce(() => {
      started.resolve()
      return complete.promise
    })
    if (outcome === "error") {
      bitcoinProvider.mockImplementation(() => {
        throw new Error("old session failed")
      })
    }
    const newClient = { name: "new client" }
    createClient
      .mockReturnValueOnce(newClient)
      .mockReturnValue({ name: "old client" })
    sessionState.session = session(true)
    await started.promise
    sessionState.session = null
    sessionState.session = session(false)
    await vi.waitFor(() => expect(lifiState.client).toBe(newClient))

    complete.resolve()
    // The old initializer's continuation was queued before this one.
    await complete.promise
    expect(lifiState.client).toBe(newClient)
    expect(lifiState.isInitialized).toBe(true)
    expect(lifiState.error).toBeNull()
    expect(createClient).toHaveBeenCalledOnce()
  })

  it("publishes an initialization error for the current session", async () => {
    createClient.mockImplementationOnce(() => {
      throw new Error("current session failed")
    })
    sessionState.session = session(false)
    await vi.waitFor(() =>
      expect(lifiState.error).toBe("current session failed"),
    )
    expect(lifiState.client).toBeNull()
    expect(lifiState.isInitialized).toBe(false)
  })
})
