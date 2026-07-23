"use client"

import { useEffect, useMemo, useState } from "react"
import { useDebouncedEffect } from "@react-hookz/web"
import { formatUnits, parseUnits } from "ethers"
import { Button, Text } from "ui"
import { useSnapshot } from "valtio"

import { TokenLogo } from "@/components/TokenLogo/TokenLogo"
import { formatTokenValue } from "@/components/Utils/tokenFormat"
import { isNativeToken } from "@/ethers-utils"
import { useTokenBalances } from "@/hooks/useTokenBalances"
import { useSelectedCurrency } from "@/stores/currencyStore"
import { useTranslation } from "@/translations"

import { swapState, updateSwapAmount } from "../../swapStore"
import styles from "./AmountInputBox.module.css"

export default function AmountInputBox() {
  const { translations } = useTranslation()
  const selectedCurrency = useSelectedCurrency()
  const swapSnap = useSnapshot(swapState)
  const origin = swapSnap.origin
  const fromAmount = swapSnap.fromAmount
  const [uiAmount, setUiAmount] = useState<string>("0")

  const { balances, prices } = useTokenBalances()

  useDebouncedEffect(
    () => {
      let amountUnits = BigInt(0)
      try {
        if (origin) {
          amountUnits = parseUnits(uiAmount, origin.decimals)
        }
      } finally {
        updateSwapAmount(amountUnits)
      }
    },
    [origin, uiAmount],
    500,
  )
  //If fromAmount is set from the outside, we need to set the ui-amount accordingly
  useEffect(() => {
    if (origin) {
      setUiAmount(formatUnits(fromAmount, origin.decimals))
    }
  }, [origin, fromAmount])

  const maxAmount = useMemo(() => {
    if (!balances || !origin) {
      return BigInt(0)
    }
    const chain = balances.byChain.get(origin.chainId)
    return parseUnits(
      chain?.get(origin.address)?.amount ?? "0",
      origin.decimals,
    )
  }, [balances, origin])

  const totalValue = useMemo(
    () =>
      origin && prices && uiAmount
        ? Number(prices.getBy(origin)) * Number(uiAmount)
        : 0,
    [origin, uiAmount, prices],
  )

  return (
    <div className={styles.wrapper}>
      <Text style="14-400">{translations.swap.amountInputBoxHeader}</Text>

      {origin?.symbol ? (
        <div className={styles.symbolContainer}>
          <TokenLogo
            address={origin.address}
            chainId={origin.chainId}
            alt={origin.symbol}
            height={0}
          />

          <div className={styles.symbolBox}>
            <input
              title="Input field"
              className={styles.input}
              type="number"
              pattern={"d*"}
              min={0}
              value={uiAmount}
              translate="no"
              onChange={(e) => {
                try {
                  const valueAsBigint = parseUnits(
                    e.currentTarget.value,
                    origin.decimals,
                  )
                  if (valueAsBigint > maxAmount) return
                  setUiAmount(e.currentTarget.value)
                } catch {
                  setUiAmount("0")
                }
              }}
            />

            <Text
              style="14-400"
              color="text-secondary"
              truncate={true}
              translate="no"
            >
              {formatTokenValue(totalValue, selectedCurrency)}
            </Text>
          </div>

          <div className={styles.maxBtnBox}>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {Number(uiAmount) > 0 && (
                <Button
                  variant="pill"
                  text="Clear"
                  onClick={() => setUiAmount("0")}
                />
              )}
              {!isNativeToken(origin.address) && (
                <Button
                  variant="pill"
                  text="MAX"
                  disabled={fromAmount >= maxAmount}
                  onClick={() => {
                    if (!maxAmount) return
                    setUiAmount(formatUnits(maxAmount, origin.decimals))
                  }}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <Text style="14-400">
          {translations.swap.amountInputBoxPlaceholder}
        </Text>
      )}
    </div>
  )
}
