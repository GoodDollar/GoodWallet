import type { ClobClient } from "@polymarket/clob-client"
import useSWR from "swr"

import { QUERY_REFETCH_INTERVALS } from "../constants/query"
import { useTrading } from "../providers/TradingProvider"

export type PolymarketPosition = {
  proxyWallet: string
  asset: string
  conditionId: string
  size: number
  avgPrice: number
  initialValue: number
  currentValue: number
  cashPnl: number
  percentPnl: number
  totalBought: number
  realizedPnl: number
  percentRealizedPnl: number
  curPrice: number
  redeemable: boolean
  mergeable: boolean
  title: string
  slug: string
  icon: string
  eventSlug: string
  eventId?: string
  outcome: string
  outcomeIndex: number
  oppositeOutcome: string
  oppositeAsset: string
  endDate: string
  negativeRisk: boolean
}

export default function useUserPositions(walletAddress: string | undefined) {
  const { clobClient } = useTrading()
  return useSWR(
    walletAddress && clobClient
      ? [walletAddress, "polymarket-positions"]
      : null,
    async (): Promise<PolymarketPosition[]> => {
      if (!walletAddress || !clobClient) return []

      const response = await fetch(
        `/api/polymarket/positions?user=${walletAddress}`,
      )

      if (!response.ok) {
        throw new Error("Failed to fetch positions")
      }

      const rawPositions: PolymarketPosition[] = await response.json()
      // Promise.all fires the price lookups in parallel and preserves input
      // order, so positions never reshuffle while fetching.
      return Promise.all(
        rawPositions.map((position) => fixPosition(position, clobClient)),
      )
    },
    {
      refreshInterval: QUERY_REFETCH_INTERVALS.POSITIONS,
      revalidateOnFocus: true,
    },
  )
}

// The data API returns a stale curPrice and pre-computes currentValue/cashPnl/
// percentPnl from it. Override with the live CLOB best-bid and recalculate the
// derived fields. On failure we keep the original position so one bad lookup
// doesn't fail the whole request.
const fixPosition = async (
  position: PolymarketPosition,
  clobClient: ClobClient,
): Promise<PolymarketPosition> => {
  try {
    const { price } = await clobClient.getPrice(position.asset, "SELL")
    const curPrice = Number.parseFloat(price)
    const currentValue = position.size * curPrice
    const cashPnl = currentValue - position.initialValue
    const percentPnl =
      position.initialValue > 0 ? (cashPnl / position.initialValue) * 100 : 0
    return { ...position, curPrice, currentValue, cashPnl, percentPnl }
  } catch (error) {
    console.error(error)
    return position
  }
}
