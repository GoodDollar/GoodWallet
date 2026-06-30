"use client"

import { ERROR_STYLES } from "../constants/ui.ts"

interface ErrorStateProps {
  error: Error | string | unknown
  title?: string
}

export default function ErrorState({
  error,
  title = "Error",
}: ErrorStateProps) {
  const errorMessage =
    error instanceof Error ? error.message : String(error || "Unknown error")

  return (
    <div className={`${ERROR_STYLES}`}>
      <p className="text-center text-[var(--color-error)]">
        {title}: {errorMessage}
      </p>
    </div>
  )
}
