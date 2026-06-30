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

export const openWalletConnectDialog = async (args: WalletConnectDialog) => {
  walletConnectDialogStore.dialog = args
  walletConnectDialogStore.status = "pending"
  walletConnectDialogStore.exiting = false

  await new Promise((resolve) => {
    subscribe(walletConnectDialogStore, () => {
      if (walletConnectDialogStore.status !== "pending") {
        resolve(null)
      }
    })
  })

  return walletConnectDialogStore.status as WalletConnectDialogStatus
}

export const updateWalletConnectDialogStatus = async (
  status: WalletConnectDialogStatus,
) => {
  walletConnectDialogStore.exiting = true
  await new Promise((resolve) => setTimeout(resolve, 200))
  walletConnectDialogStore.status = status
}
