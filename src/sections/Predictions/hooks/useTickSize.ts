import { useCallback, useEffect, useState } from "react"
import { fetchTickSize } from "@polymarket/client/actions"

import { polymarketPublicClient } from "../utils/publicClient.ts"

export default function useTickSize(tokenId: string | null) {
  const [tickSize, setTickSize] = useState<number>(0.01)
  const [isLoading, setIsLoading] = useState(false)

  // Only the UI needs this, for price stepping and validation - the SDK resolves
  // tick size itself when it signs an order.
  const loadTickSize = useCallback(async () => {
    if (!tokenId) return

    setIsLoading(true)
    try {
      const result = await fetchTickSize(polymarketPublicClient, { tokenId })
      const parsed = typeof result === "string" ? parseFloat(result) : result
      if (parsed && !isNaN(parsed) && parsed > 0) {
        setTickSize(parsed)
      }
    } catch (error) {
      console.warn("Failed to fetch tick size, using default:", error)
    } finally {
      setIsLoading(false)
    }
  }, [tokenId])

  useEffect(() => {
    loadTickSize()
  }, [loadTickSize])

  return { tickSize, isLoading, refetch: loadTickSize }
}
