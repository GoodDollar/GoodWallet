"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "ui"
import { parseUnits } from "viem"

import { AnalyticsEventTypes } from "@/analytics/types.ts"
import { useAnalytics } from "@/analytics/useAnalytics.ts"

import CloseDialogButton from "../components/CloseDialogButton.tsx"
import { USDC_E_DECIMALS } from "../constants/tokens"
import { SUCCESS_STYLES } from "../constants/ui"
import usePolygonBalances from "../hooks/usePolygonBalances"
import useUsdcTransfer from "../hooks/useUsdcTransfer"
import Portal from "../Portal"
import { useTrading } from "../providers/TradingProvider"
import { useWallet } from "../providers/WalletContext.tsx"
import { cn } from "../utils/classNames.ts"

type TransferModalProps = {
  isOpen: boolean
  onClose: () => void
}

export default function TransferModal({ isOpen, onClose }: TransferModalProps) {
  const [amount, setAmount] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)
  const { relayClient, safeAddress } = useTrading()
  const { isTransferring, error, transferUsdc } = useUsdcTransfer()
  const { eoaAddress } = useWallet()
  const { formattedUsdcBalance, rawUsdcBalance } =
    usePolygonBalances(safeAddress)
  const { captureEvent } = useAnalytics()

  useEffect(() => {
    if (isOpen) {
      setAmount("")
      setShowSuccess(false)
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose()
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

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

  if (!isOpen) return null

  const handleTransfer = async () => {
    if (!relayClient || !amount) return

    try {
      const amountBigInt = parseUnits(amount, USDC_E_DECIMALS)

      await transferUsdc(relayClient, {
        recipient: eoaAddress as `0x${string}`,
        amount: amountBigInt,
      })
      captureEvent({
        type: AnalyticsEventTypes.PolymarketWithdraw,
        usdceAmount: Number(amount),
      })
      setShowSuccess(true)
      setTimeout(() => onClose(), 2000)
    } catch (err) {
      captureEvent({
        type: AnalyticsEventTypes.PolymarketWithdrawFailed,
        usdceAmount: Number(amount),
        errorReason: err instanceof Error ? err.message : "Unknown error",
      })
      console.error("Transfer failed:", err)
    }
  }

  const handleSendMax = () => {
    if (rawUsdcBalance) {
      setAmount((Number(rawUsdcBalance) / 10 ** USDC_E_DECIMALS).toString())
    }
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
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
            <h3 className="text-lg font-bold">Withdraw</h3>
            <CloseDialogButton onClick={onClose} />
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className={cn("mb-4", SUCCESS_STYLES)}>
              <p className="text-[var(--color-success)] font-medium text-sm">
                Transfer successful!
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-[var(--token-error-muted)] border border-[var(--token-error-muted)] rounded-lg p-3">
              <p className="text-[var(--color-error)] text-sm">
                {error.message}
              </p>
            </div>
          )}

          {/* Balance Display */}
          <div className="mb-4 bg-white/5 rounded-lg p-3">
            <p className="text-xs text-[var(--text-secondary)] mb-1">
              Available Balance
            </p>
            <p className="text-lg font-bold">{formattedUsdcBalance} USDC.e</p>
          </div>

          {/* Recipient Input */}
          <div className="mb-4">
            <label
              className="block text-sm text-[var(--text-secondary)] mb-2"
              htmlFor="recipient"
            >
              Recipient Address
            </label>
            <input
              type="text"
              value={eoaAddress}
              placeholder={eoaAddress}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[var(--brand-primary)] text-white font-mono text-sm"
              disabled={true}
            />
          </div>

          {/* Amount Input */}
          <div className="mb-6">
            <label
              className="block text-sm text-[var(--text-secondary)] mb-2"
              htmlFor="amount"
            >
              Amount
            </label>
            <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2 pr-16 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[var(--brand-primary)] text-white"
                disabled={isTransferring}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Button onClick={handleSendMax} variant="pill" text="MAX" />
              </div>
            </div>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleTransfer}
            disabled={isTransferring || !amount || !relayClient}
            loading={isTransferring}
            variant="solid"
            full
            text={isTransferring ? "Sending..." : "Withdraw"}
          />

          {!relayClient && (
            <p className="text-xs text-[var(--color-warning)] mt-2 text-center">
              Start a trading session first
            </p>
          )}
        </div>
      </div>
    </Portal>
  )
}
