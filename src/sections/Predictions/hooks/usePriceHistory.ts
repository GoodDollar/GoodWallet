import { type MarketPrice, PriceHistoryInterval } from "@polymarket/clob-client"
import useSWR from "swr"

import { QUERY_REFETCH_INTERVALS } from "../constants/query"
import { useTrading } from "../providers/TradingProvider"
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
  const { clobClient } = useTrading()
  const fidelity = FIDELITY_BY_INTERVAL[interval]

  return useSWR(
    clobClient ? [`price-history-market-${market.id}`, interval] : null,
    async () => {
      if (!clobClient) return []
      const history = await clobClient.getPricesHistory({
        market: market.clobTokenIds?.[0] ?? "",
        interval,
        fidelity,
      })
      if (history.length === 0) return []
      // biome-ignore lint/suspicious/noExplicitAny: getPricesHistory return type is wrong
      return (history as any).history as MarketPrice[]
    },
    {
      refreshInterval: QUERY_REFETCH_INTERVALS.REALTIME_PRICES_MARKET,
    },
  )
}
