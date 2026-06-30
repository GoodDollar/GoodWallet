"use client"

import { useCallback } from "react"
import { close } from "@sentry/nextjs"
import { Button } from "ui"

import { useTranslation } from "translations"
import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"
import { setBottomSheetProps } from "@/components/Snippet/BottomSheet/bottomSheetStore"
import { config } from "@/config"
import { inviteCodeStore } from "@/gooddollar/stores/inviteCodeStore"
import { useRouteTransition } from "@/hooks/useRouteTransition"
import { useSessionContext } from "@/login"
import { postMessageToReactNative } from "@/utils/messageReactNative"

import styles from "../OptionsView.module.css"

export default function OptionsMenu() {
  const { locale, translations } = useTranslation()
  const optionsTranslations = translations.options
  setBottomSheetProps({ title: optionsTranslations.title })
  const { logout: _logout } = useSessionContext()
  const { captureEvent, logout: logoutAnalytics } = useAnalytics()

  const gotoExternal = (url: string, target?: string) => {
    if (typeof window !== "undefined") {
      window.open(url, target)
    }
  }
  const gotoRoot = useRouteTransition(`/${locale}`)

  const logout = useCallback(async () => {
    inviteCodeStore.inviteCode = null
    if (!_logout) {
      throw new Error("logout function is not defined")
    }

    await close()
    _logout()
    captureEvent({ type: AnalyticsEventTypes.LoggedOut })
    logoutAnalytics()
    postMessageToReactNative({ type: "LOGOUT" })
    gotoRoot()
  }, [_logout, captureEvent, logoutAnalytics, gotoRoot])

  return (
    <div className={styles.toolbarContainer}>
      <Button
        variant="list"
        icon="Support"
        text={optionsTranslations.support}
        onClick={() => {
          const url = config.faqUrl
          captureEvent({ type: AnalyticsEventTypes.GotoHelp, url })
          gotoExternal(url, "_blank")
        }}
      />

      <Button
        variant="list"
        icon="Privacy"
        text={optionsTranslations.privacyPolicy}
        onClick={() => {
          captureEvent({ type: AnalyticsEventTypes.PrivacyPolicyTabSelected })
          gotoExternal("https://www.gooddollar.org/privacy-policy", "_blank")
        }}
      />

      <Button
        variant="list"
        icon="Legal"
        text={optionsTranslations.termsOfUse}
        onClick={() => {
          captureEvent({ type: AnalyticsEventTypes.TermsOfUseTabSelected })
          gotoExternal("https://www.gooddollar.org/terms-of-use", "_blank")
        }}
      />

      <Button
        variant="list"
        icon="Legacy"
        text={optionsTranslations.gotoGW1}
        onClick={() => {
          captureEvent({ type: AnalyticsEventTypes.GotoOldGoodWallet })
          gotoExternal("https://wallet.gooddollar.org?isV1=true", "_blank")
        }}
      />

      <Button
        variant="list"
        icon="Logout"
        text={optionsTranslations.logout}
        onClick={logout}
      />
    </div>
  )
}
