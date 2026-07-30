import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ISigner, ISignerSession } from "@/login/types"

const localStorageMock = () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
})

describe("session storage", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("purges a legacy persisted signer session on startup", async () => {
    const storage = localStorageMock()
    vi.stubGlobal("localStorage", storage)

    await import("./storage")

    expect(storage.removeItem).toHaveBeenCalledWith("SIGNER_SESSION")
    expect(storage.getItem).not.toHaveBeenCalled()
  })

  it("keeps private-key sessions in memory only", async () => {
    const storage = localStorageMock()
    vi.stubGlobal("localStorage", storage)
    const { sessionState, setSession } = await import("./storage")
    const session: ISignerSession = {
      type: "PRIVATE_KEY",
      sessionOrigin: "test",
      signer: {} as ISigner,
      masterSeed: "secret",
    }

    setSession(session)

    expect(sessionState.session).toBe(session)
    expect(storage.setItem).not.toHaveBeenCalled()
    expect(storage.removeItem).toHaveBeenCalledWith("SIGNER_SESSION")
    expect(sessionState.isLoading).toBe(false)
  })
})
