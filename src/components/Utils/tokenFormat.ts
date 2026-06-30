import type { SelectedCurrency } from "@/stores/currencyStore"

/**
 * @purpose
 * Calculates the appropriate number of decimal places to display based on the value's magnitude.
 * Smaller numbers require more precision to be visible/meaningful.
 *
 * @example
 * getDecimals(0.0005) -> 6
 * getDecimals(100) -> 2
 */
const getDecimals = (value: number): number => {
  const absValue = Math.abs(value)
  if (absValue >= 1 || absValue === 0) return 2
  if (absValue >= 0.1) return 3
  if (absValue >= 0.01) return 4
  if (absValue >= 0.001) return 5
  if (absValue >= 0.0001) return 6
  if (absValue >= 0.00001) return 7
  if (absValue >= 0.000001) return 8
  if (absValue >= 0.0000001) return 9
  return 10
}

/**
 * @purpose
 * Formats a token amount with dynamic precision and compact notation.
 * Appends the token symbol to the formatted number.
 *
 * @example
 * formatTokenAmount(1234.5678, "ETH") -> "1.23K ETH"
 * formatTokenAmount(0.000045, "BTC") -> "0.000045 BTC"
 */
const formatTokenAmount = (
  amount: number | string,
  symbol?: string,
): string => {
  const amountNumber = typeof amount === "string" ? parseFloat(amount) : amount
  const numberFormat = new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: getDecimals(amountNumber),
    useGrouping: true,
    roundingMode: "trunc",
    trailingZeroDisplay: "stripIfInteger",
    notation: "compact",
  })
  const amountStr = numberFormat.format(amountNumber)
  if (symbol) {
    return `${amountStr} ${symbol}`
  }
  return amountStr
}

/**
 * @purpose
 * Formats a single token's price converted to the selected currency.
 *
 * @example
 * formatTokenPrice(0.05, { currency: 'EUR', usdExchangeRate: 0.85, symbol: '€' }) -> "€0.0425"
 */
const formatTokenPrice = (
  usdPrice: number | string,
  outputCurrency: SelectedCurrency,
): string => {
  const usdPriceNumber =
    typeof usdPrice === "string" ? parseFloat(usdPrice) : usdPrice
  const priceInOutputCurrency = usdPriceNumber * outputCurrency.usdExchangeRate

  const numberFormat = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: outputCurrency.currency,
    currencyDisplay: "narrowSymbol",
    useGrouping: true,
    roundingMode: "halfCeil",
    minimumFractionDigits: 2,
    maximumFractionDigits: getDecimals(priceInOutputCurrency),
    trailingZeroDisplay: "auto",
    notation: "compact",
  })
  const formattedNumber = numberFormat.format(priceInOutputCurrency)
  return formattedNumber.replace(outputCurrency.currency, outputCurrency.symbol)
}

/**
 * @purpose
 * Formats the total value of a token holding converted to the selected currency.
 * Unlike price, this imposes a fixed precision based on the exchange rate's magnitude.
 *
 * @example
 * formatTokenValue(100, { currency: 'EUR', usdExchangeRate: 0.851, symbol: '€' }) -> "€85.10"
 */
const formatTokenValue = (
  usdValue: number | string,
  outputCurrency: SelectedCurrency,
): string => {
  const usdValueNumber =
    typeof usdValue === "string" ? parseFloat(usdValue) : usdValue
  const valueInOutputCurrency = usdValueNumber * outputCurrency.usdExchangeRate

  const decimals = Math.max(2, getDecimals(outputCurrency.usdExchangeRate) - 1)

  const numberFormat = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: outputCurrency.currency,
    currencyDisplay: "narrowSymbol",
    useGrouping: true,
    roundingMode: "halfCeil",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    trailingZeroDisplay: "auto",
    notation: "compact",
  })

  const formattedNumber = numberFormat.format(valueInOutputCurrency)
  return formattedNumber.replace(outputCurrency.currency, outputCurrency.symbol)
}

export { formatTokenAmount, formatTokenPrice, formatTokenValue }
