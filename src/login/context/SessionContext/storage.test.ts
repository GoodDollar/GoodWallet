import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ISigner, ISignerSession } from "@/login/types"

let capturedOnAccountChanged: () => void = () => {}
let capturedOnDisconnected: () => void = () => {}

vi.mock("@/login/reown", () => ({
  watchReownAccount: vi.fn((_address, onAccountChanged, onDisconnected) => {
    capturedOnAccountChanged = onAccountChanged
    capturedOnDisconnected = onDisconnected
    return vi.fn()
  }),
  disconnectReown: vi.fn().mockResolvedValue(undefined),
  getReownSession: vi.fn(),
}))

vi.mock("@/sections/WalletConnect/store/walletConnectStore", () => ({
  disconnectAllWalletConnectSessions: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/stores/transactionHistoryStore", () => ({
  clearActivityHistory: vi.fn(),
  initActivityAccount: vi.fn(),
}))

import { sessionState, setSession } from "./storage"

describe("SessionContext storage", () => {
  const dummySigner = {
    CELO: { address: "0x1111111111111111111111111111111111111111" },
  } as unknown as ISigner

  const reownSession: ISignerSession = {
    type: "REOWN",
    address: "0x1111111111111111111111111111111111111111",
    signer: dummySigner,
    sessionOrigin: "direct",
  }

  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, val: string) => store.set(key, val)),
      removeItem: vi.fn((key: string) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
    })
    setSession(null)
  })

  it("sets reconnectReason to disconnected when external wallet disconnects", () => {
    setSession(reownSession)
    expect(sessionState.session).toBeTruthy()
    expect(sessionState.reconnectReason).toBeUndefined()

    // Trigger disconnect callback
    capturedOnDisconnected()

    expect(sessionState.session).toBeNull()
    expect(sessionState.reconnectReason).toBe("disconnected")
  })

  it("sets reconnectReason to accountChanged when external wallet account changes", () => {
    setSession(reownSession)
    expect(sessionState.session).toBeTruthy()
    expect(sessionState.reconnectReason).toBeUndefined()

    // Trigger account changed callback
    capturedOnAccountChanged()

    expect(sessionState.session).toBeNull()
    expect(sessionState.reconnectReason).toBe("accountChanged")
  })
})
