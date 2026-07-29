"use client"

import { useCallback, useState } from "react"
import { Button, Divider, Drawer, Icon, openDialog, Text, useToast } from "ui"

import { useTranslation } from "translations"
import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"
import { setBottomSheetProps } from "@/components/Snippet/BottomSheet/bottomSheetStore"
import { truncateString } from "@/components/Utils/format"
import VersionTag from "@/components/VersionTag/VersionTag"
import { type ISigner, useSessionContext } from "@/login"
import { getPrivateKeyHex } from "@/login/adapters/privatekey"
import { getSessionFromLocalStorage } from "@/login/context/SessionContext/storage"

import OptionsMenu from "./components/OptionsMenu"
import styles from "./OptionsView.module.css"

export default function OptionsView() {
  const { translations } = useTranslation()
  const { createToast } = useToast()
  const optionsTranslations = translations.options
  setBottomSheetProps({ title: optionsTranslations.title })
  const { signer, type } = useSessionContext()
  const { captureEvent } = useAnalytics()
  const [expanded, setExpanded] = useState(false)
  const [selectedChainType, setSelectedChainType] = useState<keyof ISigner>()

  const handleCopyPrivateKey = async () => {
    if (!selectedChainType) return
    const session = await getSessionFromLocalStorage()
    if (!session || session.type !== "PRIVATE_KEY") return

    const status = await openDialog({
      title: optionsTranslations.confirmation,
      bodyText: optionsTranslations.privateKeyExportDisclaimer,
      acceptBtnText: "OK",
      rejectBtnText: "Cancel",
    })

    if (status === "accepted") {
      const privateKey = getPrivateKeyHex(selectedChainType, session.masterSeed)
      navigator.clipboard.writeText(privateKey)
      captureEvent({ type: AnalyticsEventTypes.PrivateKeyCopied })
      setSelectedChainType(undefined)
      createToast({
        message: optionsTranslations.copiedPrivateKey,
        status: "success",
        autoClose: true,
      })
    }
  }

  const handleCopyPublicKey = useCallback(() => {
    if (!selectedChainType) return
    const key = signer?.[selectedChainType]?.address

    if (!key) return
    navigator.clipboard.writeText(key)
    captureEvent({
      type: AnalyticsEventTypes.PublicKeyCopied,
      family: selectedChainType,
    })
    setSelectedChainType(undefined)
    createToast({
      message: optionsTranslations.copiedPublicKey,
      status: "success",
      autoClose: true,
    })
  }, [
    captureEvent,
    createToast,
    optionsTranslations.copiedPublicKey,
    selectedChainType,
    signer,
  ])

  const accountsLines = signer
    ? Object.keys(signer)
        .map((key) => {
          const account = signer[key as keyof ISigner]
          if (!account) return null
          return (
            <div key={account.address} className={styles.dropdownLine}>
              <div className={styles.dropdownAddrContainer}>
                <Text style="16-600" color="brand">
                  {key} Address
                </Text>
                <Text style="12-400" color="text-soft" translate="no">
                  {truncateString(account.address)}
                </Text>
              </div>

              <Button
                variant="square"
                icon="BsThreeDots"
                onClick={() => {
                  setSelectedChainType(key as keyof ISigner)
                }}
              />
            </div>
          )
        })
        .filter(Boolean)
    : []

  const headerLine = (
    <div className={styles.dropdownLine}>
      <div style={{ display: "flex", gap: 20 }}>
        <Icon name="AccountsIcon" size="big" />
        <Text style="16-600">Addresses ({accountsLines.length})</Text>
      </div>

      <Button
        variant="square"
        icon={expanded ? "BsChevronUp" : "BsChevronDown"}
        onClick={() => setExpanded((prev) => !prev)}
      />
    </div>
  )
  return (
    <div className={styles.viewContainer}>
      <div className={styles.gradientBorder}>
        <div className={styles.addrDropdown}>
          {accountsLines.length > 1 ? headerLine : accountsLines}
          {expanded && accountsLines}
        </div>
      </div>

      <OptionsMenu />

      <Drawer
        open={!!selectedChainType}
        onClose={() => setSelectedChainType(undefined)}
      >
        <Button
          variant="list"
          icon="BsCopy"
          text={optionsTranslations.copyPublic}
          onClick={handleCopyPublicKey}
        />
        {type === "PRIVATE_KEY" ? (
          <>
            <Divider color="muted" />
            <Button
              variant="list"
              icon="BsExclamationTriangle"
              text={optionsTranslations.copyPrivate}
              onClick={handleCopyPrivateKey}
            />
          </>
        ) : null}
      </Drawer>

      <VersionTag />
    </div>
  )
}
