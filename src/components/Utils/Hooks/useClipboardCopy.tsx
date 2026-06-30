import { useCallback, useEffect, useRef, useState } from "react"

export const useClipboardCopy = (
  text?: string,
  resetTimeoutMs: number = 1500,
): [boolean, () => void] => {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const clearResetTimeout = useCallback(() => {
    const { current: timeout } = timeoutRef

    if (timeout) {
      clearTimeout(timeout)
      timeoutRef.current = undefined
    }
  }, [])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text ?? "")

    setCopied(true)
    clearResetTimeout()

    timeoutRef.current = setTimeout(() => setCopied(false), resetTimeoutMs)
  }, [text, resetTimeoutMs, setCopied, clearResetTimeout])

  useEffect(() => clearResetTimeout, [clearResetTimeout])
  return [copied, handleCopy]
}
