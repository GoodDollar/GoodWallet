"use client"

import { useEffect, useMemo, useState } from "react"
import { Side } from "@polymarket/clob-client"

import EmptyState from "../../components/EmptyState.tsx"
import ErrorState from "../../components/ErrorState.tsx"
import LoadingState from "../../components/LoadingState.tsx"
import { POLLING_DURATION, POLLING_INTERVAL } from "../../constants/query.ts"
import { DUST_THRESHOLD } from "../../constants/validation.ts"
import useClobOrder from "../../hooks/useClobOrder"
import usePolygonBalances from "../../hooks/usePolygonBalances.ts"
import useRedeemPosition from "../../hooks/useRedeemPosition.ts"
import useUserPositions, {
  type PolymarketPosition,
} from "../../hooks/useUserPositions"
import { useTrading } from "../../providers/TradingProvider"
import { useWallet } from "../../providers/WalletContext.tsx"
import { createPollingInterval } from "../../utils/polling.ts"
import PositionCard from "./PositionCard.tsx"
import PositionFilters from "./PositionFilters.tsx"

export default function UserPositions() {
  const { relayClient, safeAddress } = useTrading()
  const { eoaAddress } = useWallet()

  const {
    data: positions,
    isLoading,
    mutate: mutateUserPositions,
    error,
  } = useUserPositions(safeAddress as string | undefined)

  const { mutate: mutatePolygonBalances } = usePolygonBalances(safeAddress)

  const [hideDust, setHideDust] = useState(true)
  const [redeemingAsset, setRedeemingAsset] = useState<string | null>(null)

  const { redeemPosition } = useRedeemPosition()
  const { submitOrder, isSubmitting } = useClobOrder(eoaAddress)
  const [sellingAsset, setSellingAsset] = useState<string | null>(null)

  const [pendingVerification, setPendingVerification] = useState<
    Map<string, number>
  >(new Map())
  useEffect(() => {
    if (!positions || pendingVerification.size === 0) return

    const stillPending = new Map<string, number>()

    pendingVerification.forEach((originalSize, asset) => {
      const currentPosition = positions.find((p) => p.asset === asset)
      const currentSize = currentPosition?.size || 0
      const sizeChanged = currentSize < originalSize

      if (!sizeChanged) {
        stillPending.set(asset, originalSize)
      }
    })

    if (stillPending.size !== pendingVerification.size) {
      setPendingVerification(stillPending)
    }
  }, [positions, pendingVerification])

  const handleMarketSell = async (position: PolymarketPosition) => {
    setSellingAsset(position.asset)
    try {
      await submitOrder({
        tokenId: position.asset,
        size: position.size,
        side: Side.SELL,
        negRisk: position.negativeRisk,
        isMarketOrder: true,
      })

      setPendingVerification((prev) =>
        new Map(prev).set(position.asset, position.size),
      )

      mutateUserPositions()
      createPollingInterval(
        () => {
          mutateUserPositions()
        },
        POLLING_INTERVAL,
        POLLING_DURATION,
      )

      setTimeout(() => {
        setPendingVerification((prev) => {
          const next = new Map(prev)
          next.delete(position.asset)
          return next
        })
      }, POLLING_DURATION)
    } catch (err) {
      console.error("Failed to sell position:", err)
      alert("Failed to sell position. Please try again.")
    } finally {
      setSellingAsset(null)
    }
  }

  const handleRedeem = async (position: PolymarketPosition) => {
    if (!relayClient) {
      alert("Relay client not initialized")
      return
    }

    setRedeemingAsset(position.asset)
    try {
      await redeemPosition(relayClient, {
        conditionId: position.conditionId,
        outcomeIndex: position.outcomeIndex,
        negativeRisk: position.negativeRisk,
        size: position.size,
      })

      mutatePolygonBalances()
      mutateUserPositions()

      createPollingInterval(
        () => {
          mutatePolygonBalances()
          mutateUserPositions
        },
        POLLING_INTERVAL,
        POLLING_DURATION,
      )
    } catch (err) {
      console.error("Failed to redeem position:", err)
      alert("Failed to redeem position. Please try again.")
    } finally {
      setRedeemingAsset(null)
    }
  }

  const activePositions = useMemo(() => {
    if (!positions) return []

    let filtered = positions.filter((p) => p.size >= DUST_THRESHOLD)

    if (hideDust) {
      filtered = filtered.filter((p) => p.currentValue >= DUST_THRESHOLD)
    }

    return filtered
  }, [positions, hideDust])

  if (isLoading) {
    return <LoadingState message="Loading positions..." />
  }

  if (error) {
    return <ErrorState error={error} title="Error loading positions" />
  }

  if (!positions || activePositions.length === 0) {
    return (
      <EmptyState
        title="No Open Positions"
        message="You don't have any open positions."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Position Count and Dust Toggle */}
      <PositionFilters
        positionCount={activePositions.length}
        hideDust={hideDust}
        onToggleHideDust={() => setHideDust(!hideDust)}
      />

      {/* Dust Warning Banner */}
      {hideDust && positions && positions.length > activePositions.length && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <p className="text-[var(--color-warning)] text-sm">
            Hiding {positions.length - activePositions.length} dust position(s)
            (value &lt; ${DUST_THRESHOLD.toFixed(2)})
          </p>
        </div>
      )}

      {/* Positions List */}
      <div className="space-y-3">
        {activePositions.map((position) => (
          <PositionCard
            key={`${position.conditionId}-${position.outcomeIndex}`}
            position={position}
            onRedeem={handleRedeem}
            onSell={handleMarketSell}
            isSelling={sellingAsset === position.asset}
            isRedeeming={redeemingAsset === position.asset}
            isPendingVerification={pendingVerification.has(position.asset)}
            isSubmitting={isSubmitting}
            canRedeem={!!relayClient}
          />
        ))}
      </div>
    </div>
  )
}
