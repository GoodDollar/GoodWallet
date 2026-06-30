"use client"

import { useEffect } from "react"
import type { Route } from "@lifi/sdk"
import { Button } from "ui"
import { useSnapshot } from "valtio"

import dialogStyles from "@/ui/dialog/styles.module.css"

import { RouteBox } from "../RouteBox/RouteBox"
import styles from "./styles.module.css"
import { swapDialogStore, updateSwapDialogStatus } from "./swapDialogStore"

const stringify = (data: unknown) => JSON.stringify(data, null, 2)

export const ConfirmSwapDialog = () => {
  const dialogSnap = useSnapshot(swapDialogStore)

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [])

  if (dialogSnap.status !== "pending") return null
  return (
    <div
      className={dialogStyles.dialogOverlay}
      onClick={(e) => {
        updateSwapDialogStatus("rejected")
        e.stopPropagation()
      }}
    >
      <dialog
        className={[
          dialogStyles.dialogContainer,
          dialogSnap.exiting && dialogStyles.dialogContainerExiting,
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={dialogStyles.closeBtn}>
          <Button
            variant="icon"
            icon="BsXCircle"
            size="big"
            onClick={() => updateSwapDialogStatus("rejected")}
          />
        </div>
        <h1 className={dialogStyles.dialogTitle}>{dialogSnap.title}</h1>

        {dialogSnap.message ? (
          <pre className={styles.message}>{stringify(dialogSnap.message)}</pre>
        ) : null}

        {dialogSnap.route ? (
          <RouteBox route={dialogSnap.route as Route} hideExpand={true} />
        ) : null}

        <div className={dialogStyles.btnBox}>
          <Button
            variant="solid"
            text={dialogSnap.acceptBtnText ?? ""}
            full
            onClick={() => updateSwapDialogStatus("accepted")}
          />
          {dialogSnap.rejectBtnText ? (
            <Button
              variant="ghost"
              text={dialogSnap.rejectBtnText}
              full
              onClick={() => updateSwapDialogStatus("rejected")}
            />
          ) : null}
        </div>
      </dialog>
    </div>
  )
}
