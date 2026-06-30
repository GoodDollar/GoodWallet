"use client"

import { useEffect } from "react"
import { Button } from "ui"
import { proxy, subscribe, useSnapshot } from "valtio"

import dialogStyles from "@/ui/dialog/styles.module.css"

export const sendDialogStore = proxy<{
  status: "pending" | "accepted" | "rejected"
  exiting: boolean
}>()

export const openSendDialog = async () => {
  sendDialogStore.status = "pending"
  sendDialogStore.exiting = false

  await new Promise((resolve) => {
    subscribe(sendDialogStore, () => {
      if (sendDialogStore.status !== "pending") {
        resolve(null)
      }
    })
  })

  return sendDialogStore.status as "accepted" | "rejected"
}

export const updateSendDialogStatus = async (
  status: "pending" | "accepted" | "rejected",
) => {
  sendDialogStore.exiting = true
  await new Promise((resolve) => setTimeout(resolve, 200))
  sendDialogStore.status = status
}

export const SendConfirmDialog = (props: {
  children: React.ReactNode
  title?: string
  disableAcceptBtn?: boolean
  loading?: boolean
  acceptBtnLabel?: string
  rejectBtnLabel?: string
}) => {
  const { status, exiting } = useSnapshot(sendDialogStore)

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [])

  if (status !== "pending") return null

  return (
    <div
      className={dialogStyles.dialogOverlay}
      onClick={(e) => {
        updateSendDialogStatus("rejected")
        e.stopPropagation()
      }}
    >
      <dialog
        className={[
          dialogStyles.dialogContainer,
          exiting && dialogStyles.dialogContainerExiting,
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {props.title && (
          <h1 className={dialogStyles.dialogTitle}>{props.title}</h1>
        )}
        {props.children}
        <div className={dialogStyles.btnBox}>
          <Button
            variant="solid"
            text={props.acceptBtnLabel ?? "OK"}
            full
            disabled={props.disableAcceptBtn}
            loading={props.loading}
            onClick={() => updateSendDialogStatus("accepted")}
          />
          <Button
            variant="ghost"
            text={props.rejectBtnLabel ?? "Cancel"}
            full
            onClick={() => updateSendDialogStatus("rejected")}
          />
        </div>
      </dialog>
    </div>
  )
}
