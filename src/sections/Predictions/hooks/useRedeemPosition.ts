import { useCallback } from "react"
import type { SecureClient } from "@polymarket/client"

import { AnalyticsEventTypes } from "@/analytics/types.ts"
import { useAnalytics } from "@/analytics/useAnalytics.ts"

export default function useRedeemPosition() {
  const { captureEvent } = useAnalytics()

  const redeemPosition = useCallback(
    async (client: SecureClient, conditionId: string): Promise<void> => {
      try {
        // The SDK builds and submits the redemption itself, picking the standard
        // or neg-risk collateral adapter based on the condition.
        const redeem = await client.redeemPositions({ conditionId })
        await redeem.wait()

        captureEvent({
          type: AnalyticsEventTypes.PolymarketRedeemPositionSucceeded,
          conditionId,
        })
      } catch (err) {
        console.error("Redeem error:", err)
        captureEvent({
          type: AnalyticsEventTypes.PolymarketRedeemPositionFailed,
          errorReason: err instanceof Error ? err.message : "Unknown error",
        })
        throw err
      }
    },
    [captureEvent],
  )

  return { redeemPosition }
}
