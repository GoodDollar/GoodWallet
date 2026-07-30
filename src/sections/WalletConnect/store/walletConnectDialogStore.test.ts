import { describe, expect, it } from "vitest"

import {
  openWalletConnectDialog,
  walletConnectDialogStore,
} from "./walletConnectDialogStore"

const dialog = (title: string) => ({
  type: "generic" as const,
  title,
  bodyText: title,
  acceptBtnText: "Approve",
})

describe("openWalletConnectDialog", () => {
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
})
