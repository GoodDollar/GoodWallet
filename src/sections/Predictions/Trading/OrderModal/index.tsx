"use client"

import { useEffect, useRef, useState } from "react"
import { Side } from "@polymarket/clob-client"
import { Button, createToast, updateToast } from "ui"

import { useTranslation } from "translations"
import { AnalyticsEventTypes } from "@/analytics/types.ts"
import { useAnalytics } from "@/analytics/useAnalytics.ts"

import CloseDialogButton from "../../components/CloseDialogButton.tsx"
import useClobOrder from "../../hooks/useClobOrder.ts"
import usePolygonBalances from "../../hooks/usePolygonBalances.ts"
import useTickSize from "../../hooks/useTickSize.ts"
import Portal from "../../Portal.tsx"
import { useTrading } from "../../providers/TradingProvider.tsx"
import { isOrderSizeValid } from "../../utils/validation.ts"
import OrderForm from "./OrderForm.tsx"
import OrderSummary from "./OrderSummary.tsx"
import OrderTypeToggle from "./OrderTypeToggle.tsx"

function getDecimalPlaces(tickSize: number): number {
  if (tickSize >= 1) return 0
  const str = tickSize.toString()
  const decimalPart = str.split(".")[1]
  return decimalPart ? decimalPart.length : 0
}

function isValidTickPrice(price: number, tickSize: number): boolean {
  if (tickSize <= 0) return false
  const multiplier = Math.round(price / tickSize)
  const expectedPrice = multiplier * tickSize
  // Allow small floating point tolerance
  return Math.abs(price - expectedPrice) < 1e-10
}

type OrderPlacementModalProps = {
  isOpen: boolean
  onClose: () => void
  marketTitle: string
  outcome: string
  orderMinSize: number // taker order minimum is 1$, maker order minimum is 5 shares
  currentPrice: number
  tokenId: string
  negRisk?: boolean
}

export default function OrderPlacementModal({
  isOpen,
  onClose,
  marketTitle,
  outcome,
  orderMinSize,
  currentPrice,
  tokenId,
  negRisk = false,
}: OrderPlacementModalProps) {
  const [size, setSize] = useState<string>("")
  const [orderType, setOrderType] = useState<"market" | "limit">("market")
  const [limitPrice, setLimitPrice] = useState<string>("")
  const [localError, setLocalError] = useState<string | null>(null)
  const { safeAddress } = useTrading()
  const { usdceBalance } = usePolygonBalances(safeAddress)
  const { captureEvent } = useAnalytics()

  const modalRef = useRef<HTMLDivElement>(null)

  // Fetch tick size dynamically for this market
  const { tickSize, isLoading: isLoadingTickSize } = useTickSize(
    isOpen ? tokenId : null,
  )
  const decimalPlaces = getDecimalPlaces(tickSize)
  const { translations } = useTranslation()

  const {
    submitOrder,
    isSubmitting,
    error: orderError,
    orderId,
  } = useClobOrder(safeAddress)

  useEffect(() => {
    if (isOpen) {
      setSize("")
      setOrderType("market")
      setLimitPrice("")
      setLocalError(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (orderId && isOpen) {
      const timer = setTimeout(() => {
        onClose()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [orderId, isOpen])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  const sizeNum = parseFloat(size) || 0
  const limitPriceNum = parseFloat(limitPrice) || 0.01
  const effectivePrice = orderType === "limit" ? limitPriceNum : currentPrice

  useEffect(() => {
    const requestedAmount =
      orderType === "market" ? Number(size) : limitPriceNum * Number(size)

    if (requestedAmount > Number(usdceBalance)) {
      setLocalError("Insufficient funds")
    } else {
      setLocalError(null)
    }
  }, [usdceBalance, size, limitPriceNum, orderType, currentPrice])

  useEffect(() => {
    if (isOpen && size && orderMinSize) {
      if (!isOrderSizeValid(orderType, sizeNum, orderMinSize)) {
        setLocalError(
          orderType === "market"
            ? translations.predictions.marketTakerOrderFailedMiniumAmount
            : translations.predictions.limitOrderFailedMiniumAmount(
                orderMinSize,
              ),
        )
      }
    }
  }, [sizeNum, orderMinSize, isOpen, orderType, limitPriceNum])

  if (!isOpen) return null

  const handlePlaceOrder = async () => {
    if (orderType === "limit") {
      if (!limitPrice || limitPriceNum <= 0) {
        setLocalError("Limit price is required")
        return
      }

      if (limitPriceNum < tickSize || limitPriceNum > 1 - tickSize) {
        setLocalError(
          `Price must be between $${tickSize.toFixed(decimalPlaces)} and $${(1 - tickSize).toFixed(decimalPlaces)}`,
        )
        return
      }

      if (!isValidTickPrice(limitPriceNum, tickSize)) {
        setLocalError(`Price must be a multiple of tick size ($${tickSize})`)
        return
      }
    }

    const notId = createToast({
      message: "Submitting order",
      status: "pending",
    })
    try {
      await submitOrder({
        tokenId,
        size: sizeNum,
        price: effectivePrice,
        side: Side.BUY,
        negRisk,
        isMarketOrder: orderType === "market",
      })
      captureEvent({
        type: AnalyticsEventTypes.PolymarketOrderPlacementSucceeded,
        orderType,
        size: sizeNum,
        priceUsdce: limitPriceNum,
        totalCostUsdce: sizeNum * limitPriceNum,
        side: "BUY",
        tokenId,
        marketTitle,
      })
      updateToast({
        id: notId,
        message: "Order placed successfully",
        status: "success",
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error while placing the order"
      setLocalError(message)
      captureEvent({
        type: AnalyticsEventTypes.PolymarketOrderPlacementFailed,
        errorReason: message,
      })
      updateToast({
        id: notId,
        message,
        status: "error",
      })
      console.error("[predictions] place order:", err)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={handleBackdropClick}
      >
        <div
          ref={modalRef}
          className="bg-[var(--bg-surface)] rounded-lg p-6 max-w-md w-full border border-white/10 shadow-2xl animate-modal-fade-in"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">{marketTitle}</h3>
              <p className="text-sm text-[var(--brand-primary)]">
                Buying: {outcome}
              </p>
            </div>
            <CloseDialogButton onClick={onClose} />
          </div>

          {/* Error Message */}
          {(localError || orderError) && (
            <div className="mb-4 bg-[var(--token-error-muted)] border border-[var(--token-error-muted)] rounded-lg p-3">
              <p className="text-[var(--color-error)] text-sm">
                {localError || orderError?.message}
              </p>
            </div>
          )}

          {/* Order Type Toggle */}
          <OrderTypeToggle
            orderType={orderType}
            onChangeOrderType={(type) => {
              setOrderType(type)
              setLocalError(null)
            }}
          />

          {/* Order Form */}
          <OrderForm
            size={size}
            onSizeChange={(value) => {
              setSize(value)
              setLocalError(null)
            }}
            limitPrice={limitPrice}
            onLimitPriceChange={(value) => {
              setLimitPrice(value)
              setLocalError(null)
            }}
            orderType={orderType}
            currentPrice={currentPrice}
            isSubmitting={isSubmitting}
            tickSize={tickSize}
            decimalPlaces={decimalPlaces}
            isLoadingTickSize={isLoadingTickSize}
          />

          {/* Order Summary */}
          <OrderSummary size={sizeNum} price={effectivePrice} />

          {/* Place Order Button */}
          <Button
            onClick={handlePlaceOrder}
            disabled={localError != null || isSubmitting || sizeNum <= 0}
            loading={isSubmitting}
            variant="solid"
            full
            text={isSubmitting ? "Placing Order..." : "Place Order"}
          />
        </div>
      </div>
    </Portal>
  )
}
