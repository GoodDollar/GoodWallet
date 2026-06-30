import { useCallback, useRef, useState } from "react"
import { Button } from "ui"

import CloseDialogButton from "../../components/CloseDialogButton"
import { SUCCESS_STYLES } from "../../constants/ui"
import Portal from "../../Portal"
import { useTrading } from "../../providers/TradingProvider"
import { cn } from "../../utils/classNames"

export default function AuthenticateWithPolymarket({
  onComplete,
  onClose,
}: {
  onComplete: () => void
  onClose: () => void
}) {
  const [showSuccess, setShowSuccess] = useState(false)
  const {
    welcomeLoading,
    handleFirstWelcomeStep,
    relayClient,
    tradingSession,
  } = useTrading()
  const modalRef = useRef<HTMLDivElement>(null)

  const handleAuthenticateWithPolymarket = useCallback(async () => {
    if (!relayClient) {
      throw new Error("Relay client not found")
    }
    if (!tradingSession) {
      throw new Error("Trading session not found")
    }
    await handleFirstWelcomeStep()
    setShowSuccess(true)
    setTimeout(() => onComplete(), 2000)
    onComplete()
  }, [onComplete, relayClient, tradingSession])

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        {/* Header */}
        <div
          ref={modalRef}
          className="bg-[var(--bg-surface)] rounded-lg p-6 max-w-md w-full border border-white/10 shadow-2xl animate-modal-fade-in"
        >
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold">Authenticate with Polymarket</h3>
            <CloseDialogButton onClick={onClose} />
          </div>

          <div className="mb-4 bg-white/5 rounded-lg p-3">
            <p className="text-xs text-[var(--text-secondary)] mb-1">
              Polymarket needs to authenticate with your wallet to start trading
            </p>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className={cn("mb-4", SUCCESS_STYLES)}>
              <p className="text-[var(--color-success)] font-medium text-sm">
                Authenticated with Polymarket successfully!
              </p>
            </div>
          )}

          {/* Authenticate Button */}
          <Button
            disabled={welcomeLoading}
            loading={welcomeLoading}
            onClick={handleAuthenticateWithPolymarket}
            variant="solid"
            text={
              welcomeLoading
                ? "Authenticating..."
                : "Authenticate with polymarket"
            }
            full
          />
        </div>
      </div>
    </Portal>
  )
}
