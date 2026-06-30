import useSWR from "swr"
import { Button } from "ui"

import { formatTokenValue } from "@/components/Utils/tokenFormat.ts"
import { CURRENCY_SYMBOLS } from "@/stores/currencyStore.ts"

import Badge from "../../components/Badge.tsx"
import Card from "../../components/Card.tsx"
import StatDisplay from "../../components/StatDisplay.tsx"
import { QUERY_REFETCH_INTERVALS } from "../../constants/query.ts"
import type { PolymarketOrder } from "../../hooks/useActiveOrders.tsx"

interface OrderCardProps {
  order: PolymarketOrder
  onCancel: (orderId: string) => void
  isCancelling: boolean
  isSubmitting: boolean
}

export default function OrderCard({
  order,
  onCancel,
  isCancelling,
  isSubmitting,
}: OrderCardProps) {
  const { data: marketInfo } = useSWR(
    [order.asset_id, "market-info"],
    async () => {
      try {
        const response = await fetch(
          `/api/polymarket/markets/clobTokenIds/${order.asset_id}`,
        )
        if (!response.ok) return null
        return await response.json()
      } catch {
        return null
      }
    },
    {
      refreshInterval: QUERY_REFETCH_INTERVALS.ORDERS,
      revalidateOnFocus: true,
    },
  )

  const price = parseFloat(order.price)
  const shares = parseFloat(order.original_size)
  const totalValue = shares * price

  const getOutcome = () => {
    if (!marketInfo?.outcomes || !marketInfo?.clobTokenIds) return null
    try {
      const outcomes = JSON.parse(marketInfo.outcomes)
      const tokenIds = JSON.parse(marketInfo.clobTokenIds)
      const outcomeIndex = tokenIds.indexOf(order.asset_id)
      return outcomes[outcomeIndex] || outcomes[0]
    } catch {
      return null
    }
  }

  return (
    <Card className="p-4">
      {/* Market Title and Buy/Sell Badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          {marketInfo ? (
            <>
              <h4 className="font-semibold text-base mb-1 line-clamp-2">
                {marketInfo.question || "Market"}
              </h4>
              {getOutcome() && (
                <div className="text-sm text-[var(--brand-primary)] font-medium">
                  {getOutcome()}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-[var(--text-secondary)]">
              Loading...
            </div>
          )}
        </div>

        <Badge variant={order.side === "BUY" ? "buy" : "sell"}>
          {order.side}
        </Badge>
      </div>

      {/* Order Details Grid */}
      <div className="grid grid-cols-3 gap-3 p-3 bg-white/5 rounded-lg">
        <StatDisplay label="Price" value={`¢${Math.round(price * 100)}`} />
        <StatDisplay label="Shares" value={shares.toFixed(0)} />
        <StatDisplay
          label="Total"
          value={formatTokenValue(totalValue, {
            currency: "USD",
            symbol: CURRENCY_SYMBOLS.USD,
            usdExchangeRate: 1,
          })}
        />
      </div>

      {/* Created At Timestamp */}
      {order.created_at && (
        <div className="mt-2 text-xs text-[var(--text-secondary)]">
          {new Date(order.created_at * 1000).toLocaleString()}
        </div>
      )}

      {/* Cancel Order Button */}
      <div className="mt-3">
        <Button
          onClick={() => onCancel(order.id)}
          disabled={isCancelling || isSubmitting}
          loading={isCancelling}
          variant="outlined"
          text={isCancelling ? "Cancelling..." : "Cancel Order"}
          full
        />
      </div>
    </Card>
  )
}
