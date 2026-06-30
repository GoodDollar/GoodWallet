// biome-ignore-all lint/suspicious/noExplicitAny: need to cast the window
import useSWR from "swr"

import type { CategoryId } from "../constants/categories"
import { getCategoryById } from "../constants/categories"
import { QUERY_REFETCH_INTERVALS } from "../constants/query"
import { useTrading } from "../providers/TradingProvider"

export type PolymarketEvent = {
  id: string
  volume: number
  image: string
  markets: PolymarketMarket[]
  title?: string
}

export type PolymarketMarket = {
  id: string
  question: string
  active: boolean
  description: string
  closed: boolean
  orderMinSize: number
  icon?: string
  volume?: string
  volume24hr?: string | number
  liquidity?: string | number
  outcomes?: string[]
  outcomePrices?: string[]
  clobTokenIds: string[]
  negRisk?: boolean
  acceptingOrders: boolean
  groupItemTitle: string
}

interface UseMarketsOptions {
  limit?: number
  categoryId?: CategoryId
}

const DEFAULT_CATEGORY_TAG_ID_TRENDING = "0"

export default function useMarkets(options: UseMarketsOptions = {}) {
  const { limit = 10, categoryId = "trending" } = options
  const { clobClient } = useTrading()

  return useSWR(
    [limit, categoryId, !!clobClient, "high-volume-markets"],
    async (): Promise<PolymarketEvent[]> => {
      const category = getCategoryById(categoryId)
      const url = `/api/polymarket/events/tags/${category?.tagId || DEFAULT_CATEGORY_TAG_ID_TRENDING}?limit=${limit}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch events")
      }

      const events = await response.json()
      return events as PolymarketEvent[]
    },
    {
      refreshInterval: QUERY_REFETCH_INTERVALS.REALTIME_PRICES_MARKET,
      revalidateOnFocus: true,
    },
  )
}
