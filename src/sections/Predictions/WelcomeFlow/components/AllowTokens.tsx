import { useCallback, useRef, useState } from "react"
import { Button } from "ui"

import CloseDialogButton from "../../components/CloseDialogButton"
import { SUCCESS_STYLES } from "../../constants/ui"
import Portal from "../../Portal"
import { useTrading } from "../../providers/TradingProvider"
import { cn } from "../../utils/classNames"

export default function AllowTokens({
  onComplete,
  onClose,
}: {
  onComplete: () => void
  onClose: () => void
}) {
  const [showSuccess, setShowSuccess] = useState(false)
  const {
    relayClient,
    handleThirdWelcomeStep,
    welcomeLoading,
    tradingSession,
  } = useTrading()
  const modalRef = useRef<HTMLDivElement>(null)

  const handleAllowTokens = useCallback(async () => {
    if (!relayClient) {
      throw new Error("Relay client not found")
    }
    await handleThirdWelcomeStep()
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
            <h3 className="text-lg font-bold">Allow tokens</h3>
            <CloseDialogButton onClick={onClose} />
          </div>

          <div className="mb-4 bg-white/5 rounded-lg p-3">
            <p className="text-xs text-[var(--text-secondary)] mb-1">
              To use Polymarket you have to approve USDC.e tokens
            </p>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className={cn("mb-4", SUCCESS_STYLES)}>
              <p className="text-[var(--color-success)] font-medium text-sm">
                Approved successful!
              </p>
            </div>
          )}

          {/* Error Message 
          {error && (
            <div className="mb-4 bg-[var(--token-error-muted)] border border-[var(--token-error-muted)] rounded-lg p-3">
              <p className="text-[var(--color-error)] text-sm">{error.message}</p>
            </div>
          )}
            */}

          {/* Allow Tokens Button */}
          <Button
            onClick={handleAllowTokens}
            disabled={welcomeLoading}
            loading={welcomeLoading}
            variant="solid"
            text={welcomeLoading ? "Allowing Tokens..." : "Allow Tokens"}
            full
          />
        </div>
      </div>
    </Portal>
  )
}
