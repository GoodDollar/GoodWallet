"use client"

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { parseUri } from "@walletconnect/utils"
import { Button, useToast } from "ui"
import { useSnapshot } from "valtio"

import { useTranslation } from "translations"
import { Input } from "@/components/Form/Input/Input"
import QrScanner from "@/components/QrScanner/QrScanner"
import { setBottomSheetProps } from "@/components/Snippet/BottomSheet/bottomSheetStore"
import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import { config } from "@/config"
import { sessionState } from "@/login/context/SessionContext/storage"

import { SessionsStatus } from "./components/SessionsStatus/SessionsStatus"
import { walletConnectState } from "./store/walletConnectStore"
import style from "./WalletConnectView.module.css"

export default function WalletConnectView() {
  setBottomSheetProps({ title: "WalletConnect" })
  const { translations } = useTranslation()
  const [wcUri, setUri] = useState("")
  const { createToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const snap = useSnapshot(walletConnectState)
  const sessions = snap.sessions
  const walletConnectInstance = snap.walletConnectInstance
  const initializeWalletConnect = snap.initializeWalletConnect
  const refreshSessions = snap.refreshSessions

  const session = useSnapshot(sessionState).session

  const onUriChange = ({ target }: ChangeEvent<HTMLInputElement>) =>
    setUri(target.value)

  useEffect(() => {
    if (session && config.walletConnectEnabled) {
      initializeWalletConnect(session.signer)
    }
  }, [session, initializeWalletConnect])

  const uriValid = useMemo(() => {
    const parsedUri = parseUri(wcUri)
    return (
      wcUri.length > 0 &&
      parsedUri.version > 0 &&
      parsedUri.topic.length > 0 &&
      parsedUri.symKey.length > 0
    )
  }, [wcUri])

  const onConnect = useCallback(async () => {
    if (
      !walletConnectInstance ||
      walletConnectInstance === "initializing" ||
      !uriValid
    ) {
      throw new Error("WalletConnect not initialized or invalid URI")
    }
    const { topic: pairingTopic } = parseUri(wcUri)
    // if for some reason, the proposal is not received, we need to close the modal when the pairing expires (5mins)
    const pairingExpiredListener = ({ topic }: { topic: string }) => {
      if (pairingTopic === topic) {
        createToast({
          message: "Pairing expired. Please try again with new Connection URI",
          status: "error",
          autoClose: true,
        })
        walletConnectInstance.core.pairing.events.removeListener(
          "pairing_expire",
          pairingExpiredListener,
        )
      }
    }
    walletConnectInstance.once("session_proposal", () => {
      walletConnectInstance.core.pairing.events.removeListener(
        "pairing_expire",
        pairingExpiredListener,
      )
    })

    try {
      setIsLoading(true)
      walletConnectInstance.core.pairing.events.on(
        "pairing_expire",
        pairingExpiredListener,
      )
      await walletConnectInstance.pair({ uri: wcUri })
    } catch (error) {
      console.error("Pairing failed", error)
      createToast({
        message: "Pairing failed. Please try again with new Connection URI",
        status: "error",
        autoClose: true,
      })
    } finally {
      refreshSessions()
      setIsLoading(false)
      setUri("")
    }
  }, [wcUri, walletConnectInstance, uriValid, createToast, refreshSessions])

  if (!config.walletConnectEnabled) {
    return null
  }

  if (sessions.length > 0) {
    return <SessionsStatus />
  }

  if (walletConnectInstance === "initializing") {
    return <LoadingSpinner />
  }

  return (
    <div className={style.walletConnectView}>
      <div className={style.walletConnectQrScanner}>
        <QrScanner onScan={setUri} />
      </div>

      <Input
        type="input"
        label={translations.walletConnect.wcUriName}
        value={wcUri}
        placeholder={translations.walletConnect.wcUriPlaceholder}
        isValid={uriValid}
        onChange={onUriChange}
      />
      <Button
        variant="solid"
        text={translations.walletConnect.connectBtnText}
        full
        loading={isLoading}
        onClick={onConnect}
        disabled={!uriValid}
      />
    </div>
  )
}
