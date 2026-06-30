"use client"

import { Icon, openDialog, Text } from "ui"
import { useSnapshot } from "valtio"

import { useTranslation } from "translations"
import { setBottomSheetProps } from "@/components/Snippet/BottomSheet/bottomSheetStore"
import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import { useRouteTransition } from "@/hooks/useRouteTransition"
import { useEffectOnce } from "@/hooks/utils"

import AmountInputBox from "./components/AmountInputBox/AmountInputBox"
import AssetSelectBox from "./components/AssetSelectBox/AssetSelectBox"
import RouteSlider from "./components/RouteSlider/RouteSlider"
import { lifiState } from "./lifiStore"
import styles from "./SwapView.module.css"

const SWAP_SHOW_DISCLAIMER_KEY = "ShowSwapDialog"

export default function SwapView() {
  const { translations, locale } = useTranslation()
  const gotoHome = useRouteTransition(`/${locale}`)
  setBottomSheetProps({
    title: translations.swap.title,
  })
  const { isInitialized, error } = useSnapshot(lifiState)

  useEffectOnce(() => {
    if (typeof window !== "undefined") {
      const shouldShowDisclaimer = localStorage.getItem(
        SWAP_SHOW_DISCLAIMER_KEY,
      )
      if (shouldShowDisclaimer == null || shouldShowDisclaimer === "true") {
        const dismiss = () =>
          localStorage.setItem(SWAP_SHOW_DISCLAIMER_KEY, "false")
        openDialog({
          title: translations.swap.firstTimeDialog.title,
          bodyText: translations.swap.firstTimeDialog.body,
          bodyAlign: "left",
          acceptBtnText: translations.swap.firstTimeDialog.acceptBtn,
          acceptAction: dismiss,
          onClose: dismiss,
        })
      }
    }
  }, [])

  if (!isInitialized) {
    return error ? (
      <div className={styles.wrapper}>
        <Text color="error" style="14-600">
          {error}
        </Text>
      </div>
    ) : (
      <LoadingSpinner />
    )
  }

  return (
    <div className={styles.wrapper}>
      <AssetSelectBox />
      <AmountInputBox />
      <RouteSlider
        confirmButtonText={translations.swap.routesReviewBtn}
        handleRedirectAfterSwap={gotoHome}
      />

      <div className={styles.footer}>
        <Text
          color="text-soft"
          style="12-400"
          className="inline-flex items-center gap-1"
        >
          Powered by{" "}
          <span
            className="rounded-full inline-flex items-center"
            style={{ transform: "scale(1.5)" }}
          >
            <Icon name="lifiLogo" size="big" color="white" />
          </span>
        </Text>
      </div>
    </div>
  )
}
