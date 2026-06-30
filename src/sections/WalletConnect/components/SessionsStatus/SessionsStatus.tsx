import { useCallback, useState } from "react"
import { getSdkError } from "@walletconnect/utils"
import { Button } from "ui"
import { useSnapshot } from "valtio"

import { useTranslation } from "translations"

import { walletConnectState } from "../../store/walletConnectStore"
import { SessionsHeader } from "../SessionsHeader/SessionsHeader"
import { getIcon } from "../WalletConnectDialog/utils"
import style from "./SessionsStatus.module.css"

export const SessionsStatus = () => {
  const { translations } = useTranslation()

  const snap = useSnapshot(walletConnectState)
  const sessions = snap.sessions
  const walletConnectInstance = snap.walletConnectInstance
  const refreshSessions = snap.refreshSessions

  const [isLoading, setIsLoading] = useState(false)

  const onDisconnectAll = useCallback(async () => {
    if (!walletConnectInstance || "initializing" === walletConnectInstance) {
      throw new Error("WalletConnect not initialized")
    }
    try {
      setIsLoading(true)
      await Promise.all(
        sessions.map((s) =>
          walletConnectInstance.disconnectSession({
            topic: s.topic,
            reason: getSdkError("USER_DISCONNECTED"),
          }),
        ),
      )
    } finally {
      refreshSessions()
      setIsLoading(false)
    }
  }, [walletConnectInstance, sessions, refreshSessions])

  return (
    <ul className={style.listContainer}>
      {sessions.map(({ peer, topic }) => (
        <li key={topic} className={style.listElement}>
          <SessionsHeader
            icon={getIcon(peer.metadata.url, peer.metadata.icons)}
            name={peer.metadata.name}
            url={peer.metadata.url}
          />

          <Button
            variant="solid"
            color="red"
            full
            text={translations.walletConnect.disconnectBtnText}
            onClick={onDisconnectAll}
            disabled={isLoading}
          />
        </li>
      ))}
    </ul>
  )
}
