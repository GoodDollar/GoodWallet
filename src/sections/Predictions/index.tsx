"use client"

import { useEffect, useRef } from "react"
import { openDialog } from "ui"

import { setBottomSheetProps } from "@/components/Snippet/BottomSheet/bottomSheetStore"
import { useTranslation } from "@/translations"

import SwapOverlay from "../Swap/SwapOverlay"
import { Footer } from "./components"
import PolygonAssets from "./PolygonAssets"
import { useTrading } from "./providers/TradingProvider"
import { useWallet } from "./providers/WalletContext"
import MarketTabs from "./Trading/MarketTabs"
import WelcomeFlow from "./WelcomeFlow"

const WELCOME_SHOW_DISCLAIMER_KEY = "ShowWelcomeDialogPolymarket"

export default function PredictionsView() {
  const { translations } = useTranslation()
  const predictionsTranslations = translations.predictions
  setBottomSheetProps({
    title: predictionsTranslations.title,
    subtitle: predictionsTranslations.subtitle,
  })
  const { initializeTradingSession, isTradingSessionComplete, isGeoblocked } =
    useTrading()
  const { walletClient, eoaAddress } = useWallet()
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!walletClient || hasInitialized.current) return
    hasInitialized.current = true
    initializeTradingSession()
  }, [walletClient, initializeTradingSession])

  useEffect(() => {
    if (isTradingSessionComplete) {
      const shouldShowWelcomeDialog = localStorage.getItem(
        WELCOME_SHOW_DISCLAIMER_KEY,
      )
      if (
        shouldShowWelcomeDialog == null ||
        shouldShowWelcomeDialog === "true"
      ) {
        const dismiss = () =>
          localStorage.setItem(WELCOME_SHOW_DISCLAIMER_KEY, "false")
        openDialog({
          title: translations.predictions.welcomeDialog.title,
          bodyText: translations.predictions.welcomeDialog.body,
          bodyAlign: "left",
          acceptBtnText: translations.predictions.welcomeDialog.acceptBtn,
          shouldHideCloseButton: true,
          acceptAction: dismiss,
          onClose: dismiss,
        })
      }
    }
  }, [isTradingSessionComplete])

  if (!isTradingSessionComplete && !isGeoblocked) {
    return (
      <div className="flex items-center justify-center p-6 min-h-full">
        <WelcomeFlow />
      </div>
    )
  }

  return (
    <div className="p-6 min-h-screen flex flex-col gap-6 max-w-7xl mx-auto">
      <PolygonAssets />
      <WelcomeFlow />

      {/* Markets are viewable even when geoblocked, but trading buttons should be disabled */}
      {(isTradingSessionComplete || isGeoblocked) && eoaAddress && (
        <MarketTabs />
      )}

      <SwapOverlay />
      <Footer />
    </div>
  )
}
