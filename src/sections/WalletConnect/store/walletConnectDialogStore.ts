import type { SignClientTypes } from "@walletconnect/types"
import { proxy, subscribe } from "valtio"

type WalletConnectDialogStatus = "pending" | "accepted" | "rejected"

export type WalletConnectDialogSessionProposal = {
  type: "sessionProposal"
  sessionProposal: SignClientTypes.EventArguments["session_proposal"]
  acceptBtnText: string
  rejectBtnText: string
}

export type WalletConnectDialogSessionRequest = {
  type: "sessionRequest"
  sessionRequest: SignClientTypes.EventArguments["session_request"]
  acceptBtnText: string
  rejectBtnText: string
}

export type WalletConnectDialogGeneric = {
  type: "generic"
  title: string
  bodyText: string
  acceptBtnText: string
  rejectBtnText?: string
}

export type WalletConnectDialogError = {
  type: "error"
  errorText: string
  acceptBtnText: string
  rejectBtnText?: string
}

export type WalletConnectDialog =
  | WalletConnectDialogSessionProposal
  | WalletConnectDialogSessionRequest
  | WalletConnectDialogGeneric
  | WalletConnectDialogError

export const walletConnectDialogStore = proxy<{
  dialog: WalletConnectDialog
  status: WalletConnectDialogStatus
  exiting: boolean
}>()

type QueuedDialog = {
  args: WalletConnectDialog
  resolve: (status: WalletConnectDialogStatus) => void
}

const dialogQueue: QueuedDialog[] = []
let activeDialog: QueuedDialog | undefined
let unsubscribeActive: (() => void) | undefined

const settleActiveDialog = (status: WalletConnectDialogStatus): void => {
  const settledDialog = activeDialog
  if (!settledDialog) return

  unsubscribeActive?.()
  unsubscribeActive = undefined
  activeDialog = undefined
  settledDialog.resolve(status)
  openNextDialog()
}

const openNextDialog = (): void => {
  if (activeDialog) return
  const queuedDialog = dialogQueue.shift()
  if (!queuedDialog) return

  activeDialog = queuedDialog
  walletConnectDialogStore.dialog = queuedDialog.args
  walletConnectDialogStore.status = "pending"
  walletConnectDialogStore.exiting = false

  unsubscribeActive = subscribe(walletConnectDialogStore, () => {
    if (walletConnectDialogStore.status === "pending") return
    settleActiveDialog(walletConnectDialogStore.status)
  })
}

export const openWalletConnectDialog = (
  args: WalletConnectDialog,
): Promise<WalletConnectDialogStatus> =>
  new Promise((resolve) => {
    dialogQueue.push({ args, resolve })
    openNextDialog()
  })

export const resetWalletConnectDialogs = (): void => {
  const pendingDialogs = activeDialog
    ? [activeDialog, ...dialogQueue.splice(0)]
    : dialogQueue.splice(0)

  unsubscribeActive?.()
  unsubscribeActive = undefined
  activeDialog = undefined
  walletConnectDialogStore.status = "rejected"
  walletConnectDialogStore.exiting = false

  for (const pendingDialog of pendingDialogs) {
    pendingDialog.resolve("rejected")
  }
}

export const updateWalletConnectDialogStatus = async (
  status: WalletConnectDialogStatus,
) => {
  const dialog = activeDialog
  if (
    !dialog ||
    walletConnectDialogStore.status !== "pending" ||
    walletConnectDialogStore.exiting
  ) {
    return
  }

  walletConnectDialogStore.exiting = true
  await new Promise((resolve) => setTimeout(resolve, 200))
  if (
    activeDialog !== dialog ||
    walletConnectDialogStore.status !== "pending"
  ) {
    return
  }
  walletConnectDialogStore.status = status
}
