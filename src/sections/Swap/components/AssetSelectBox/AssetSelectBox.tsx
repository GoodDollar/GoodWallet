"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Icon, Text } from "ui"
import { useSnapshot } from "valtio"

import { TokenLogo } from "@/components/TokenLogo/TokenLogo"
import { useTokenBalances } from "@/hooks/useTokenBalances"
import {
  swapState,
  updateOriginToken,
  updateTargetToken,
} from "@/sections/Swap/swapStore"
import { useTranslation } from "@/translations"

import { TokensDrawer } from "../TokensDrawer/TokensDrawer"
import styles from "./AssetSelectBox.module.css"

export type AssetSelectBoxProps = {
  lockTargetToken?: boolean
  showDestinationToken?: boolean
  onSelectAssetCallback?: () => void
}

export default function AssetSelectBox({
  lockTargetToken = false,
  showDestinationToken = true,
  onSelectAssetCallback,
}: AssetSelectBoxProps = {}) {
  const { translations } = useTranslation()
  const swapSnap = useSnapshot(swapState)
  const [openDrawer, setOpenDrawer] = useState<"origin" | "target">()

  const searchParams = useSearchParams()
  const { tokens } = useTokenBalances()

  useEffect(() => {
    const toChainId = searchParams.get("toChainId")
    const toTokenAddress = searchParams.get("toTokenAddress")

    if (!toChainId || !toTokenAddress) return

    const chainId = parseInt(toChainId, 10)
    if (isNaN(chainId)) return

    if (!tokens) return

    const token = tokens.get(chainId)?.get(toTokenAddress)
    if (token) {
      updateTargetToken(token)
    }
  }, [searchParams, tokens])

  return (
    <div className={styles.wrapper}>
      <div
        className={[
          styles.symbolSelectBox,
          !showDestinationToken && styles.symbolSelectBoxFull,
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => {
          if (openDrawer === "origin") {
            setOpenDrawer(undefined)
          } else {
            setOpenDrawer("origin")
          }
        }}
      >
        <Text style="12-600">{translations.swap.selectBoxFromHeader}</Text>

        <div className={styles.symbolContainer}>
          {swapSnap.origin ? (
            <TokenLogo
              style={{
                borderRadius: 50,
              }}
              address={swapSnap.origin.address}
              chainId={swapSnap.origin.chainId}
              alt={swapSnap.origin.symbol}
            />
          ) : (
            <Icon name="BsHandIndex" size="larger" />
          )}

          {swapSnap.origin ? (
            <div className={styles.symbolBox}>
              <Text style="16-600" truncate={true} translate="no">
                {swapSnap.origin?.symbol}
              </Text>
              <Text style="14-400" color="text-secondary">
                {swapSnap.origin.name}
              </Text>
            </div>
          ) : (
            <div className={styles.symbolBox}>
              <Text style="12-400">
                {translations.swap.selectBoxFromPlaceholder}
              </Text>
            </div>
          )}
        </div>
      </div>

      {showDestinationToken && (
        <div
          className={[
            styles.symbolSelectBox,
            lockTargetToken && styles.symbolSelectBoxLocked,
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => {
            if (lockTargetToken) return
            if (openDrawer === "target") {
              setOpenDrawer(undefined)
            } else {
              setOpenDrawer("target")
            }
          }}
        >
          <Text style="12-600">{translations.swap.selectBoxToHeader}</Text>

          <div className={styles.symbolContainer}>
            {swapSnap.target?.symbol ? (
              <TokenLogo
                address={swapSnap.target.address}
                chainId={swapSnap.target.chainId}
                alt={swapSnap.target.name}
              />
            ) : (
              <Icon name="BsHandIndex" size="larger" />
            )}

            {swapSnap.target ? (
              <div className={styles.symbolBox}>
                <Text style="16-600" truncate={true} translate="no">
                  {swapSnap.target.symbol}
                </Text>
                <Text style="14-400" color="text-secondary">
                  {swapSnap.target.name}
                </Text>
              </div>
            ) : (
              <div className={styles.symbolBox}>
                <Text style="12-400">
                  {translations.swap.selectBoxToPlaceholder}
                </Text>
              </div>
            )}
          </div>
        </div>
      )}

      <TokensDrawer
        filter="onlyTokensWithBalance"
        isOpen={openDrawer === "origin" || false}
        openDrawer="origin"
        onClose={() => {
          setOpenDrawer(undefined)
        }}
        onSelect={(token) => {
          updateOriginToken(token)
          setOpenDrawer(undefined)
          onSelectAssetCallback && onSelectAssetCallback()
        }}
        selectedToken={swapSnap.origin}
      />

      {!lockTargetToken && showDestinationToken && (
        <TokensDrawer
          filter="allTokens"
          isOpen={openDrawer === "target"}
          openDrawer="target"
          onClose={() => {
            setOpenDrawer(undefined)
          }}
          onSelect={(token) => {
            updateTargetToken(token)
            setOpenDrawer(undefined)
          }}
          selectedToken={swapSnap.target}
          defaultChainId={swapSnap.origin?.chainId}
        />
      )}
    </div>
  )
}
