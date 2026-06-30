import { formatTokenValue } from "@/components/Utils/tokenFormat.ts"

interface OrderSummaryProps {
  size: number
  price: number
}

export default function OrderSummary({ size, price }: OrderSummaryProps) {
  if (size <= 0 || price <= 0) return null

  const shares = size / price

  return (
    <div className="mb-4 bg-white/5 rounded-lg p-3">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <span className="text-sm">Potential win</span>
          <span className="text-sm text-[var(--text-secondary)]">
            Avg. Price{" "}
            {formatTokenValue(price, {
              currency: "USD",
              symbol: "$",
              usdExchangeRate: 1,
            })}
          </span>
        </div>
        <span className="text-3xl font-semibold text-green-500">
          {formatTokenValue(shares, {
            currency: "USD",
            symbol: "$",
            usdExchangeRate: 1,
          })}
        </span>
      </div>
    </div>
  )
}
