import { Button, Text } from "ui"

import type { PolymarketMarket } from "../../hooks/useMarkets"
import { cn } from "../../utils/classNames"
import type { EventCardProps, RealtimePrices } from "./EventCard"
import styles from "./MarketRow.module.css"

interface MarketRowProps {
  market: PolymarketMarket
  realtimePrices: RealtimePrices
  disabled: boolean
  onOutcomeClick: EventCardProps["onOutcomeClick"]
  showDivider?: boolean
  onRowClick?: () => void
}

export default function MarketRow({
  market,
  realtimePrices,
  disabled,
  onOutcomeClick,
  onRowClick,
  showDivider = false,
}: MarketRowProps) {
  const tokenIds: string[] = market.clobTokenIds
  const outcomes: string[] = market.outcomes ?? []
  const negRisk = market.negRisk || false

  const yesTokenId = tokenIds[0] || ""
  const noTokenId = tokenIds[1] || ""
  const yesPrice = realtimePrices[yesTokenId] || 0
  const noPrice = realtimePrices[noTokenId] || 0
  const yesPercent = Math.round(yesPrice * 100)

  const isDisabled = market.closed || disabled
  const label = market.groupItemTitle || market.question

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2.5",
        showDivider && "border-t border-white/5",
      )}
    >
      {/* Label */}
      <div className={styles.marketLabel} onClick={onRowClick}>
        <Text style="14-400" color="text-soft" truncate>
          {label}
        </Text>
      </div>

      {/* Percentage — fixed width so buttons align across rows */}
      <p className="w-12 text-right text-base font-bold text-white tabular-nums flex-shrink-0">
        {yesPrice > 0 ? `${yesPercent}%` : "—"}
      </p>

      {/* Yes / No buttons */}
      <div className="flex gap-1.5 flex-shrink-0">
        <Button
          onClick={() => {
            if (!isDisabled && yesTokenId) {
              onOutcomeClick(
                market.question,
                outcomes[0] || "Yes",
                yesPrice,
                yesTokenId,
                negRisk,
                market.orderMinSize,
              )
            }
          }}
          disabled={isDisabled || !yesTokenId}
          variant="pill"
          text="Yes"
        />
        <Button
          onClick={() => {
            if (!isDisabled && noTokenId) {
              onOutcomeClick(
                market.question,
                outcomes[1] || "No",
                noPrice,
                noTokenId,
                negRisk,
                market.orderMinSize,
              )
            }
          }}
          disabled={isDisabled || !noTokenId}
          variant="pill"
          color="red"
          text="No"
        />
      </div>
    </div>
  )
}
