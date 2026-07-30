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
let dialogOpen = false

const openNextDialog = (): void => {
  if (dialogOpen) return
  const queuedDialog = dialogQueue.shift()
  if (!queuedDialog) return

  dialogOpen = true
  walletConnectDialogStore.dialog = queuedDialog.args
  walletConnectDialogStore.status = "pending"
  walletConnectDialogStore.exiting = false

  const unsubscribe = subscribe(walletConnectDialogStore, () => {
    if (walletConnectDialogStore.status === "pending") return
    const status = walletConnectDialogStore.status
    unsubscribe()
    dialogOpen = false
    queuedDialog.resolve(status)
    openNextDialog()
  })
}

export const openWalletConnectDialog = (
  args: WalletConnectDialog,
): Promise<WalletConnectDialogStatus> =>
  new Promise((resolve) => {
    dialogQueue.push({ args, resolve })
    openNextDialog()
  })

export const updateWalletConnectDialogStatus = async (
  status: WalletConnectDialogStatus,
) => {
  walletConnectDialogStore.exiting = true
  await new Promise((resolve) => setTimeout(resolve, 200))
  walletConnectDialogStore.status = status
}
