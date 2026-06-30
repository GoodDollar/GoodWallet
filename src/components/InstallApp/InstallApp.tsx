"use client"

import { useState } from "react"
import { useLocalStorageValue, useTimeoutEffect } from "@react-hookz/web"
import { Button, dialogStore, Icon, openDialog } from "ui"

import { useTranslation } from "translations"
import { isDeltaMobile } from "@/utils/getClientEnvironment"
import { installPrompt } from "@/utils/pwa"

export default function InstallApp() {
  const { translations } = useTranslation()
  const installApp = translations.installApp
  const showPromptInstall = useLocalStorageValue<boolean>("showPromptInstall", {
    defaultValue: true,
  })

  const [showBookInstruct, setShowBookInstruct] = useState(false)

  const [, reset] = useTimeoutEffect(() => inviteToAddToScreen(), 1 * 60 * 1000)

  const inviteToAddToScreen = async () => {
    if (isDeltaMobile() || showPromptInstall.value === false) {
      return
    }

    const isIPhone = /iPhone/.test(navigator.userAgent)

    //If another dialogue is open, try again later
    if (dialogStore.queue.length > 0) return reset()

    const { title, bodyText } = installPrompt
      ? installApp.automatic
      : installApp.manual

    const dialogStatus = await openDialog({
      title,
      bodyText,
      imgSrc: "/icons/192.png",
      imgCaption: "GoodWallet",
      acceptBtnText: "Ok",
    })

    if (dialogStatus === "accepted") {
      if (installPrompt) {
        installPrompt.prompt()
      } else if (isIPhone) {
        setShowBookInstruct(true)
      }
      showPromptInstall.set(false)
    }

    if (dialogStatus === "rejected") {
      showPromptInstall.set(false)
    }
  }

  return (
    <div
      style={{
        display: showBookInstruct ? "flex" : "none",
        bottom: 20,
        position: "fixed",
        marginInline: "auto",
        justifyContent: "center",
        padding: 20,
        backgroundColor: "var(--token-bg-raised)",
        borderRadius: 10,
        margin: 20,
        fontSize: 16,
        alignItems: "center",
        flexWrap: "wrap",
        width: "-webkit-fill-available",
        maxWidth: "var(--max-content-width)",
      }}
    >
      <div style={{ position: "absolute", top: 10, right: 10 }}>
        <Button
          variant="icon"
          icon="BsXLg"
          size="big"
          onClick={() => setShowBookInstruct(false)}
        />
      </div>
      {installApp.clickShareIcon}
      <span style={{ marginInline: 4 }}>
        <Icon name="BsBoxArrowUp" size="big" />
      </span>
      {installApp.addToHomeScreen}
      <span style={{ marginInline: 4 }}>
        <Icon name="BsPlusSquare" size="big" />
      </span>
    </div>
  )
}
