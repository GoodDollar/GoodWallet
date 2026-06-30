import { useRef, useState } from "react"
import Image from "next/image"
import { Side } from "@polymarket/clob-client"
import useSWR from "swr"
import { Button } from "ui"

import { formatTokenPrice } from "@/components/Utils/tokenFormat.ts"
import useInViewport from "@/utils/isVisible.tsx"

import Card from "../../components/Card.tsx"
import { QUERY_REFETCH_INTERVALS } from "../../constants/query.ts"
import type {
  PolymarketEvent,
  PolymarketMarket,
} from "../../hooks/useMarkets.ts"
import { useTrading } from "../../providers/TradingProvider.tsx"
import { cn } from "../../utils/classNames.ts"
import MarketRow from "./MarketRow.tsx"

export interface EventCardProps {
  event: PolymarketEvent
  disabled?: boolean
  onOutcomeClick: (
    marketTitle: string,
    outcome: string,
    price: number,
    tokenId: string,
    negRisk: boolean,
    orderMinSize: number,
  ) => void
  onMarketClick: (market: PolymarketMarket) => void
}

export type RealtimePrices = Record<string, number>

const INITIAL_VISIBLE = 2

export default function EventCard({
  event,
  disabled = false,
  onOutcomeClick,
  onMarketClick,
}: EventCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isVisible = useInViewport(ref)
  const { clobClient } = useTrading()
  const [expanded, setExpanded] = useState(false)

  // Fetch real-time prices for all token IDs across all markets in this event
  const { data: realtimePrices = {} } = useSWR<RealtimePrices>(
    clobClient && isVisible ? ["realtime-prices-event", event.id] : null,
    async () => {
      if (!clobClient) return {}
      const allTokenIds = event.markets.flatMap((m) => m.clobTokenIds)
      const results = await Promise.all(
        allTokenIds.map(async (tokenId: string) => {
          const askResponse = await clobClient.getPrice(tokenId, Side.SELL)
          const bidPrice = parseFloat(askResponse.price)
          if (isNaN(bidPrice) || bidPrice <= 0 || bidPrice >= 1) return null
          return { tokenId, bidPrice }
        }),
      )
      return results.reduce<RealtimePrices>((acc, result) => {
        if (result) acc[result.tokenId] = result.bidPrice
        return acc
      }, {})
    },
    {
      refreshInterval: QUERY_REFETCH_INTERVALS.REALTIME_PRICES_MARKET,
    },
  )

  const visibleMarkets = expanded
    ? event.markets
    : event.markets.slice(0, INITIAL_VISIBLE)
  const hiddenCount = event.markets.length - INITIAL_VISIBLE

  return (
    <Card hover className="p-4">
      <div ref={ref}>
        {/* Event Header */}
        <div className="flex items-start gap-3">
          {event.image && (
            <Image
              src={event.image}
              alt=""
              width={40}
              height={40}
              className="w-10 h-10 rounded-lg flex-shrink-0 object-cover"
            />
          )}
          <h4 className="flex-1 min-w-0 font-semibold text-sm leading-snug line-clamp-2">
            {event.title || event.markets[0].question}
          </h4>
        </div>

        {/* Market Outcome Rows */}
        <div className="mt-3">
          {visibleMarkets.map((market, idx) => (
            <MarketRow
              key={market.id}
              market={market}
              onRowClick={() => onMarketClick(market)}
              realtimePrices={realtimePrices}
              disabled={disabled}
              onOutcomeClick={onOutcomeClick}
              showDivider={idx > 0}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          className={cn(
            "flex items-center mt-3 pt-2 border-t border-white/5",
            hiddenCount > 0 ? "justify-between" : "justify-start",
          )}
        >
          <span className="text-xs text-white/40">
            {formatTokenPrice(event.volume, {
              currency: "USD",
              usdExchangeRate: 1,
              symbol: "USDCe",
            })}{" "}
            Vol.
          </span>
          {hiddenCount > 0 && (
            <Button
              onClick={() => setExpanded(!expanded)}
              variant="pill"
              text={expanded ? "Show less" : `+${hiddenCount} more`}
            />
          )}
        </div>
      </div>
    </Card>
  )
}
