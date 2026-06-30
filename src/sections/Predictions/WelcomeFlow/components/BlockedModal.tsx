import { useRef } from "react"

import CloseDialogButton from "../../components/CloseDialogButton"
import Portal from "../../Portal"

export default function GeoBlockModal({ onClose }: { onClose: () => void }) {
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
            <h3 className="text-lg font-bold">Polymarket is blocked</h3>
            <CloseDialogButton onClick={onClose} />
          </div>

          <div className="mb-4 bg-white/5 rounded-lg p-3">
            <p className="text-xs text-[var(--text-secondary)] mb-1">
              Polymarket is not available in your region.
            </p>
          </div>
        </div>
      </div>
    </Portal>
  )
}
