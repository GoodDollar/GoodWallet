import { useCallback, useState } from "react"
import type { RelayClient } from "@polymarket/builder-relayer-client"

import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"

import { checkAllApprovals, createAllApprovalTxs } from "../utils/approvals"

// Uses relayClient to set all required token approvals for trading

export default function useTokenApprovals() {
  const [error, setError] = useState<Error | null>(null)
  const [isSettingApprovals, setIsSettingApprovals] = useState(false)
  const { captureEvent } = useAnalytics()

  const checkAllTokenApprovals = useCallback(async (safeAddress: string) => {
    try {
      return await checkAllApprovals(safeAddress)
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to check approvals")
      throw error
    }
  }, [])

  const setAllTokenApprovals = useCallback(
    async (relayClient: RelayClient): Promise<boolean> => {
      try {
        setIsSettingApprovals(true)
        setError(null)
        const approvalTxs = createAllApprovalTxs()
        const response = await relayClient.execute(
          approvalTxs,
          "Set all token approvals for trading",
        )
        await response.wait()
        captureEvent({
          type: AnalyticsEventTypes.PolymarketAllowTokensSucceeded,
        })
        return true
      } catch (err) {
        console.error("Failed to set all token approvals:", err)
        captureEvent({
          type: AnalyticsEventTypes.PolymarketAllowTokensFailed,
          errorReason: err instanceof Error ? err.message : "Unknown error",
        })
        const error =
          err instanceof Error
            ? err
            : new Error("Failed to set all token approvals")
        setError(error)
        return false
      } finally {
        setIsSettingApprovals(false)
      }
    },
    [],
  )

  return {
    error,
    isSettingApprovals,
    checkAllTokenApprovals,
    setAllTokenApprovals,
  }
}
