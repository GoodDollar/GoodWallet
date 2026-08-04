"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "ui"
import { useSnapshot } from "valtio"

import dialogStyles from "@/ui/dialog/styles.module.css"

import {
  updateWalletConnectDialogStatus,
  type WalletConnectDialog as WalletConnectDialogType,
  walletConnectDialogStore,
} from "../../store/walletConnectDialogStore"
import { ErrorDialog } from "./ErrorDialog"
import { GenericDialog } from "./GenericDialog"
import { SessionProposalDialog } from "./SessionProposalDialog"
import { SessionRequestDialog } from "./SessionRequestDialog"
import styles from "./WalletConnectDialog.module.css"

const renderDialog = (dialog: WalletConnectDialogType) => {
  switch (dialog.type) {
    case "sessionProposal":
      return <SessionProposalDialog sessionProposal={dialog.sessionProposal} />
    case "sessionRequest":
      return <SessionRequestDialog sessionRequest={dialog.sessionRequest} />
    case "generic":
      return <GenericDialog title={dialog.title} bodyText={dialog.bodyText} />
    case "error":
      return <ErrorDialog errorText={dialog.errorText} />
  }
}

export const WalletConnectDialog = () => {
  const { dialog, status, exiting } = useSnapshot(walletConnectDialogStore)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (status !== "pending") return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [status])

  if (!mounted || status !== "pending") return null

  return createPortal(
    <div
      className={styles.dialogOverlay}
      onClick={(e) => {
        updateWalletConnectDialogStatus("rejected")
        e.stopPropagation()
      }}
    >
      <dialog
        className={[
          dialogStyles.dialogContainer,
          exiting && dialogStyles.dialogContainerExiting,
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {renderDialog(dialog as WalletConnectDialogType)}

        <div className={dialogStyles.btnBox}>
          <Button
            variant="solid"
            text={dialog.acceptBtnText}
            full
            onClick={() => updateWalletConnectDialogStatus("accepted")}
          />
          {dialog.rejectBtnText ? (
            <Button
              variant="ghost"
              text={dialog.rejectBtnText}
              full
              onClick={() => updateWalletConnectDialogStatus("rejected")}
            />
          ) : null}
        </div>
      </dialog>
    </div>,
    document.body,
  )
}
