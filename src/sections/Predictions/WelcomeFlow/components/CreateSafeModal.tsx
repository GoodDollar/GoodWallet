import { useCallback, useRef, useState } from "react"
import { Button } from "ui"

import CloseDialogButton from "../../components/CloseDialogButton"
import { SUCCESS_STYLES } from "../../constants/ui"
import Portal from "../../Portal"
import { useTrading } from "../../providers/TradingProvider"
import { cn } from "../../utils/classNames"

export default function CreateSafeModal({
  onComplete,
  onClose,
}: {
  onComplete: () => void
  onClose: () => void
}) {
  const [showSuccess, setShowSuccess] = useState(false)
  const {
    relayClient,
    handleSecondWelcomeStep,
    welcomeLoading,
    tradingSession,
  } = useTrading()

  const handleDeploy = useCallback(async () => {
    if (!relayClient) {
      throw new Error("Relay client not found")
    }
    await handleSecondWelcomeStep()
    setShowSuccess(true)
    setTimeout(() => onComplete(), 2000)
  }, [relayClient, onComplete, tradingSession])

  const modalRef = useRef<HTMLDivElement>(null)

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        {/* Header */}
        <div
          ref={modalRef}
          className="bg-[var(--bg-surface)] rounded-lg p-6 max-w-md w-full border border-white/10 shadow-2xl animate-modal-fade-in"
        >
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold">Safe not deployed</h3>
            <CloseDialogButton onClick={onClose} />
          </div>

          <div className="mb-4 bg-white/5 rounded-lg p-3">
            <p className="text-xs text-[var(--text-secondary)] mb-1">
              Deploy a Safe wallet to start trading in polymarket.
            </p>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className={cn("mb-4", SUCCESS_STYLES)}>
              <p className="text-[var(--color-success)] font-medium text-sm">
                Safe deployed successfully!
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

          {/* Deploy Button */}
          <Button
            disabled={welcomeLoading}
            loading={welcomeLoading}
            onClick={handleDeploy}
            variant="solid"
            text={welcomeLoading ? "Deploying Safe..." : "Deploy Safe"}
            full
          />
        </div>
      </div>
    </Portal>
  )
}
