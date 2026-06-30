"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Button, Text } from "ui"
import { useSnapshot } from "valtio"

import { useTranslation } from "translations"
import { useTokenBalances } from "@/hooks/useTokenBalances"
import { resetFormData } from "@/sections/Send/hooks/form"
import {
  closeSwapOverlay,
  SwapOverlayStep,
  swapOverlayState,
} from "@/sections/Swap/swapOverlayStore"
import { updateTargetToken } from "@/sections/Swap/swapStore"

import AmountInputBox from "./components/AmountInputBox/AmountInputBox"
import AssetSelectBox from "./components/AssetSelectBox/AssetSelectBox"
import RouteSlider from "./components/RouteSlider/RouteSlider"
import styles from "./SwapOverlay.module.css"

function SwapOverlayContent() {
  const { isOverlayOpen, params, step, handlePreviousStep } =
    useSnapshot(swapOverlayState)
  const { tokens } = useTokenBalances()
  const { translations } = useTranslation()
  const title = params ? translations.home.fund : translations.swap.title

  useEffect(() => {
    if (!isOverlayOpen || !params || !tokens) return
    const token = tokens.get(params.toChainId)?.get(params.toTokenAddress)
    if (token) {
      updateTargetToken(token)
    }
  }, [isOverlayOpen, params, tokens])

  useEffect(() => {
    if (isOverlayOpen) {
      document.body.style.overflow = "hidden"
    } else {
      resetFormData()
    }
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOverlayOpen])

  if (!isOverlayOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeSwapOverlay()
    }
  }

  return (
    <div
      className={styles.overlay}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.leftIcon}>
            {step === SwapOverlayStep.AmountInput ? (
              <Button
                variant="icon"
                icon="BsArrowLeft"
                size="small"
                onClick={() => handlePreviousStep()}
              />
            ) : null}
          </div>

          <Text style="18-600">{title}</Text>
          <Button
            variant="icon"
            icon="BsXLg"
            size="big"
            onClick={closeSwapOverlay}
          />
        </div>
        <div className={styles.body}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              width: "100%",
            }}
          >
            {step === SwapOverlayStep.AssetSelect && (
              <AssetSelectBox
                onSelectAssetCallback={swapOverlayState.handleNextStep}
                lockTargetToken={Boolean(params)}
                showDestinationToken={false}
              />
            )}
            {step === SwapOverlayStep.AmountInput && (
              <>
                <AmountInputBox />
                <RouteSlider
                  overrideToAddress={params?.toAddress}
                  confirmButtonText={"Fund"}
                  handleRedirectAfterSwap={closeSwapOverlay}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SwapOverlay() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])
  if (!mounted || typeof document === "undefined") return null
  return createPortal(<SwapOverlayContent />, document.body)
}
