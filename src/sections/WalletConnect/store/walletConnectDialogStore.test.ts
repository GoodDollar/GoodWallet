import { afterEach, describe, expect, it, vi } from "vitest"

import {
  openWalletConnectDialog,
  resetWalletConnectDialogs,
  updateWalletConnectDialogStatus,
  walletConnectDialogStore,
} from "./walletConnectDialogStore"

const dialog = (title: string) => ({
  type: "generic" as const,
  title,
  bodyText: title,
  acceptBtnText: "Approve",
})

describe("openWalletConnectDialog", () => {
  afterEach(() => {
    resetWalletConnectDialogs()
    vi.useRealTimers()
  })

  it("keeps concurrent approvals bound to their own dialogs", async () => {
    const first = openWalletConnectDialog(dialog("First"))
    const second = openWalletConnectDialog(dialog("Second"))

    expect(walletConnectDialogStore.dialog).toMatchObject({ title: "First" })

    walletConnectDialogStore.status = "accepted"
    await expect(first).resolves.toBe("accepted")
    expect(walletConnectDialogStore.dialog).toMatchObject({ title: "Second" })

    walletConnectDialogStore.status = "rejected"
    await expect(second).resolves.toBe("rejected")
  })

  it("rejects active and queued dialogs when reset", async () => {
    const first = openWalletConnectDialog(dialog("First"))
    const second = openWalletConnectDialog(dialog("Second"))

    resetWalletConnectDialogs()

    await expect(first).resolves.toBe("rejected")
    await expect(second).resolves.toBe("rejected")

    const next = openWalletConnectDialog(dialog("Next"))
    expect(walletConnectDialogStore.dialog).toMatchObject({ title: "Next" })
    walletConnectDialogStore.status = "rejected"
    await expect(next).resolves.toBe("rejected")
  })

  it("ignores a delayed update after reset", async () => {
    vi.useFakeTimers()
    const first = openWalletConnectDialog(dialog("First"))
    const update = updateWalletConnectDialogStatus("accepted")

    resetWalletConnectDialogs()
    await expect(first).resolves.toBe("rejected")

    const second = openWalletConnectDialog(dialog("Second"))
    await vi.advanceTimersByTimeAsync(200)
    await update

    expect(walletConnectDialogStore.status).toBe("pending")
    resetWalletConnectDialogs()
    await expect(second).resolves.toBe("rejected")
  })
})
