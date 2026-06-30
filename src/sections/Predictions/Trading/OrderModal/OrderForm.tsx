import usePolygonBalances from "../../hooks/usePolygonBalances.ts"
import { useTrading } from "../../providers/TradingProvider.tsx"
import { isValidDecimalInput } from "../../utils/validation.ts"

interface OrderFormProps {
  size: string
  onSizeChange: (value: string) => void
  limitPrice: string
  onLimitPriceChange: (value: string) => void
  orderType: "market" | "limit"
  currentPrice: number
  isSubmitting: boolean
  tickSize: number
  decimalPlaces: number
  isLoadingTickSize: boolean
}

const isValidPriceInput = (value: string, maxDecimals: number): boolean => {
  if (value === "" || value === "0" || value === "0.") return true
  const regex = new RegExp(`^(0?\\.[0-9]{0,${maxDecimals}}|0)$`)
  return regex.test(value)
}

export default function OrderForm({
  size,
  onSizeChange,
  limitPrice,
  onLimitPriceChange,
  orderType,
  isSubmitting,
  tickSize,
  decimalPlaces,
  isLoadingTickSize,
}: OrderFormProps) {
  const { safeAddress } = useTrading()
  const { formattedUsdcBalance } = usePolygonBalances(safeAddress)

  const handleSizeChange = (value: string) => {
    if (isValidDecimalInput(value)) {
      onSizeChange(value)
    }
  }

  const handleLimitPriceChange = (value: string) => {
    if (isValidPriceInput(value, decimalPlaces)) {
      onLimitPriceChange(value)
    }
  }

  // Ensure tickSize is a valid number before calling toFixed
  const safeTickSize =
    typeof tickSize === "number" && !isNaN(tickSize) ? tickSize : 0.01
  const tickSizeDisplay = safeTickSize.toFixed(decimalPlaces)
  const maxPriceDisplay = (1 - safeTickSize).toFixed(decimalPlaces)

  return (
    <>
      {/* Size Input */}
      <div className="mb-4 bg-white/5 rounded-lg p-3 border border-white/10 focus-within:border-[var(--brand-primary)] transition-colors">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <span className="text-sm">
              {orderType === "limit" ? "Shares" : "Amount ($)"}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">
              Balance {formattedUsdcBalance}
            </span>
          </div>
          <div className="flex items-center">
            <input
              type="text"
              value={size}
              onChange={(e) => handleSizeChange(e.target.value)}
              placeholder="0"
              className="text-3xl font-semibold text-white bg-transparent border-none focus:outline-none w-32 text-right"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      {/* Limit Price Input */}
      {orderType === "limit" && (
        <div className="mb-4">
          <label
            className="block text-sm text-[var(--text-secondary)] mb-2"
            htmlFor="limitPrice"
          >
            Limit Price ($)
            {isLoadingTickSize && (
              <span className="ml-2 text-xs text-[var(--brand-primary)]">
                Loading tick size...
              </span>
            )}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={limitPrice}
            onChange={(e) => handleLimitPriceChange(e.target.value)}
            placeholder={tickSizeDisplay}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-[var(--brand-primary)] text-white"
            disabled={isSubmitting || isLoadingTickSize}
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Tick size: ${tickSizeDisplay} • Range: ${tickSizeDisplay} - $
            {maxPriceDisplay}
          </p>
        </div>
      )}
    </>
  )
}
