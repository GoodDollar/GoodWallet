import { cn } from "../../utils/classNames.ts"
import { convertPriceToCents } from "../../utils/order.ts"

interface OutcomeButtonsProps {
  outcomes: string[]
  outcomePrices: number[]
  tokenIds: string[]
  isClosed: boolean
  negRisk: boolean
  marketQuestion: string
  orderMinSize: number
  disabled?: boolean
  onOutcomeClick: (
    marketTitle: string,
    outcome: string,
    price: number,
    tokenId: string,
    negRisk: boolean,
    orderMinSize: number,
  ) => void
}

export default function OutcomeButtons({
  outcomes,
  outcomePrices,
  tokenIds,
  isClosed,
  negRisk,
  marketQuestion,
  disabled = false,
  onOutcomeClick,
  orderMinSize,
}: OutcomeButtonsProps) {
  if (outcomes.length === 0) return null

  const isDisabled = isClosed || disabled

  return (
    <div className="flex gap-2 flex-wrap">
      {outcomes.map((outcome: string, idx: number) => {
        const tokenId = tokenIds[idx] || ""
        const price = outcomePrices[idx] || 0
        const priceInCents = convertPriceToCents(price)

        return (
          <button
            key={`outcome-${idx}`}
            onClick={() => {
              if (!isDisabled && tokenId) {
                onOutcomeClick(
                  marketQuestion,
                  outcome,
                  price,
                  tokenId,
                  negRisk,
                  orderMinSize,
                )
              }
            }}
            disabled={isDisabled || !tokenId}
            className={cn(
              "flex-1 min-w-[120px] px-3 py-2 rounded border text-center transition-all duration-200",
              isDisabled || !tokenId
                ? "bg-white/5 border-white/10 cursor-not-allowed opacity-50"
                : "bg-white/5 border-white/10 hover:bg-[var(--brand-primary-muted)] hover:border-[var(--brand-primary)] cursor-pointer",
            )}
          >
            <p className="text-xs text-white/60 mb-1 truncate">{outcome}</p>
            <p className="text-[var(--brand-primary)] font-bold text-lg">
              {priceInCents}¢
            </p>
          </button>
        )
      })}
    </div>
  )
}
