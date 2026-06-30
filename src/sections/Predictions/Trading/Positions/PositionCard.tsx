import Image from "next/image"
import { Button } from "ui"

import { formatTokenValue } from "@/components/Utils/tokenFormat.ts"
import { CURRENCY_SYMBOLS } from "@/stores/currencyStore.ts"

import Card from "../../components/Card.tsx"
import StatDisplay from "../../components/StatDisplay.tsx"
import type { PolymarketPosition } from "../../hooks/useUserPositions.ts"

interface PositionCardProps {
  position: PolymarketPosition
  onSell: (position: PolymarketPosition) => void
  onRedeem: (position: PolymarketPosition) => void
  isSelling: boolean
  isRedeeming: boolean
  isPendingVerification: boolean
  isSubmitting: boolean
  canRedeem: boolean
}

export default function PositionCard({
  position,
  onSell,
  onRedeem,
  isSelling,
  isRedeeming,
  isPendingVerification,
  isSubmitting,
  canRedeem,
}: PositionCardProps) {
  return (
    <Card className="p-4 space-y-3">
      {/* Market Title and Icon */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{position.title}</h3>
          <p className="text-sm text-white/70 mt-1">
            Outcome: <span className="text-white">{position.outcome}</span>
          </p>
        </div>
        {position.icon && (
          <Image
            width={48}
            height={48}
            src={position.icon}
            alt=""
            className="w-12 h-12 rounded"
          />
        )}
      </div>

      {/* Position Stats Grid */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <StatDisplay
          label="Size"
          value={`${position.size.toFixed(2)} shares`}
        />
        <StatDisplay
          label="Avg Purchase Price"
          value={formatTokenValue(position.avgPrice, {
            currency: "USD",
            symbol: CURRENCY_SYMBOLS.USD,
            usdExchangeRate: 1,
          })}
        />
        <StatDisplay
          label="Current Price"
          value={formatTokenValue(position.curPrice, {
            currency: "USD",
            symbol: CURRENCY_SYMBOLS.USD,
            usdExchangeRate: 1,
          })}
        />
        <StatDisplay
          label="Current Value"
          value={formatTokenValue(position.currentValue, {
            currency: "USD",
            symbol: CURRENCY_SYMBOLS.USD,
            usdExchangeRate: 1,
          })}
        />
        <StatDisplay
          label="Initial Value"
          value={formatTokenValue(position.initialValue, {
            currency: "USD",
            symbol: CURRENCY_SYMBOLS.USD,
            usdExchangeRate: 1,
          })}
        />
        <StatDisplay
          label="P&L"
          value={`${formatTokenValue(position.cashPnl, {
            currency: "USD",
            symbol: CURRENCY_SYMBOLS.USD,
            usdExchangeRate: 1,
          })} (${position.percentPnl.toFixed(1)}%)`}
          highlight={true}
          highlightColor={position.cashPnl >= 0 ? "green" : "red"}
        />
      </div>

      {/* Redeemable Event Banner */}
      {position.redeemable && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
          <p className="text-[var(--brand-secondary)] text-sm font-medium">
            Event Completed - Position Redeemable
          </p>
        </div>
      )}

      {/* Action Button - Redeem or Market Sell */}
      {position.redeemable ? (
        <>
          <Button
            onClick={() => onRedeem(position)}
            disabled={isRedeeming || !canRedeem}
            loading={isRedeeming}
            variant="outlined"
            color="red"
            text={isRedeeming ? "Redeeming..." : "Redeem Position"}
            full
          />
          {!canRedeem && (
            <p className="text-xs text-[var(--color-warning)] text-center -mt-2">
              Initialize trading session first
            </p>
          )}
        </>
      ) : (
        <>
          <Button
            onClick={() => onSell(position)}
            disabled={isSelling || isSubmitting || isPendingVerification}
            loading={isSelling || isPendingVerification}
            variant="outlined"
            color="red"
            text={
              isSelling || isPendingVerification
                ? "Processing..."
                : "Market Sell"
            }
            full
          />
        </>
      )}
    </Card>
  )
}
