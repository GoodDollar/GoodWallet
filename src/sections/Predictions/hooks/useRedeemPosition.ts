import { useCallback, useState } from "react"
import type { RelayClient } from "@polymarket/builder-relayer-client"

import { AnalyticsEventTypes } from "@/analytics/types.ts"
import { useAnalytics } from "@/analytics/useAnalytics.ts"

import { createRedeemTx, type RedeemParams } from "../utils/redeem.ts"

export default function useRedeemPosition() {
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { captureEvent } = useAnalytics()

  const redeemPosition = useCallback(
    async (
      relayClient: RelayClient,
      params: RedeemParams,
    ): Promise<boolean> => {
      setIsRedeeming(true)
      setError(null)

      try {
        const redeemTx = createRedeemTx(params)

        // Using execute() method as per your existing pattern
        const response = await relayClient.execute(
          [redeemTx],
          `Redeem position for condition ${params.conditionId}`,
        )

        await response.wait()
        captureEvent({
          type: AnalyticsEventTypes.PolymarketRedeemPositionSucceeded,
          conditionId: params.conditionId,
        })
        return true
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to redeem position")
        setError(error)
        console.error("Redeem error:", error)
        captureEvent({
          type: AnalyticsEventTypes.PolymarketRedeemPositionFailed,
          errorReason: err instanceof Error ? err.message : "Unknown error",
        })
        throw error
      } finally {
        setIsRedeeming(false)
      }
    },
    [],
  )

  return {
    isRedeeming,
    error,
    redeemPosition,
  }
}
