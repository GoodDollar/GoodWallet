"use client"

import { useEffect } from "react"
import Image from "next/image"
import { Button } from "ui"
import { useSnapshot } from "valtio"

import Typography from "@/ui/typography/Typography"

import { dialogStore, updateStatus } from "./dialogStore"
import styles from "./styles.module.css"

export const Dialog = () => {
  const { queue } = useSnapshot(dialogStore)

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [])

  const currentDialog = queue[0]

  if (currentDialog?.status !== "pending") return null

  const id = currentDialog.id
  return (
    <div
      className={styles.dialogOverlay}
      onClick={(e) => {
        currentDialog.onClose?.()
        updateStatus(id, "rejected")
        e.stopPropagation()
      }}
    >
      <dialog
        className={[
          styles.dialogContainer,
          currentDialog.exiting && styles.dialogContainerExiting,
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {(currentDialog.shouldHideCloseButton == null ||
          currentDialog.shouldHideCloseButton === false) && (
          <div className={styles.closeBtn}>
            <Button
              variant="icon"
              icon="BsXCircle"
              size="big"
              onClick={() => {
                currentDialog.onClose?.()
                updateStatus(id, "rejected")
              }}
            />
          </div>
        )}
        <h1 className={styles.dialogTitle}>{currentDialog.title}</h1>
        {currentDialog.imgSrc && (
          <div className={styles.imageContainer}>
            <Image
              src={currentDialog.imgSrc}
              alt={currentDialog.imgCaption || ""}
              width={64}
              height={64}
            />
            <Typography style="12-400">{currentDialog.imgCaption}</Typography>
          </div>
        )}
        {currentDialog?.bodyText && (
          <div
            className={styles.dialogBodyText}
            style={{ textAlign: currentDialog.bodyAlign }}
          >
            {currentDialog.bodyText.split("\n").map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}
        <div className={styles.btnBox}>
          <Button
            variant="solid"
            full
            text={currentDialog.acceptBtnText ?? ""}
            onClick={() => {
              currentDialog.acceptAction?.()
              updateStatus(id, "accepted")
            }}
          />
          {currentDialog.rejectBtnText && (
            <Button
              variant="ghost"
              full
              text={currentDialog.rejectBtnText}
              onClick={() => updateStatus(id, "rejected")}
            />
          )}
        </div>
      </dialog>
    </div>
  )
}
