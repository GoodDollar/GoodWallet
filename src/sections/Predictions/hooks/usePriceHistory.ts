import { PriceHistoryInterval } from "@polymarket/client"
import useSWR from "swr"

import { QUERY_REFETCH_INTERVALS } from "../constants/query"
import { polymarketPublicClient } from "../utils/publicClient"
import type { PolymarketMarket } from "./useMarkets"

const FIDELITY_BY_INTERVAL: Record<PriceHistoryInterval, number> = {
  [PriceHistoryInterval.ONE_HOUR]: 1,
  [PriceHistoryInterval.SIX_HOURS]: 3,
  [PriceHistoryInterval.ONE_DAY]: 10,
  [PriceHistoryInterval.ONE_WEEK]: 100,
  [PriceHistoryInterval.MAX]: 100,
}

export default function usePriceHistory(
  market: PolymarketMarket,
  interval: PriceHistoryInterval,
) {
  const fidelity = FIDELITY_BY_INTERVAL[interval]
  const tokenId = market.clobTokenIds?.[0]

  return useSWR(
    tokenId ? [`price-history-market-${market.id}`, interval] : null,
    async () => {
      if (!tokenId) return []
      return polymarketPublicClient.fetchPriceHistory({
        tokenId,
        interval,
        fidelity,
      })
    },
    {
      refreshInterval: QUERY_REFETCH_INTERVALS.REALTIME_PRICES_MARKET,
    },
  )
}
