import { proxy, useSnapshot } from "valtio"
import { subscribeKey } from "valtio/utils"

import { AnalyticsEventTypes } from "@/analytics/types"
import { captureEvent } from "@/analytics/useAnalytics"
import {
  BITCOIN_CHAIN_ID,
  CELO_CHAIN_ID,
  ETHEREUM_CHAIN_ID,
} from "@/chain/chain-ids"
import { pricesStore } from "@/hooks/useTokenBalances/stores/pricesStore"

// Helper functions
const safeParsePrice = (priceStr?: string) =>
  priceStr ? parseFloat(priceStr) || null : null

const calculateExchangeRate = (usdPrice: number | null) =>
  usdPrice && usdPrice > 0 ? 1 / usdPrice : null

const SUPPORTED_CURRENCIES = ["USD", "BTC", "ETH", "EUR"] as const
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  BTC: "₿",
  ETH: "Ξ",
  EUR: "€",
} as const

export type CurrencyFormatConfig = {
  threshold: number
  decimals: number
  useSuffix?: boolean
  minValue?: number
}

type CurrencyStore = {
  availableCurrencies: readonly CurrencyCode[]
  selectedCurrency: CurrencyCode
  rates: Record<CurrencyCode, number | null>
}

const CURRENCY_STORAGE_KEY = "goodwallet_currency_preference"
const DEFAULT_CURRENCY: CurrencyCode = "USD"

// Get the initial currency from localStorage or use default
const getInitialCurrency = (): CurrencyCode => {
  if (typeof window === "undefined") return DEFAULT_CURRENCY
  try {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY)
    // Type-safe check using array.find instead of includes + cast
    const validCurrency = SUPPORTED_CURRENCIES.find(
      (currency) => currency === stored,
    )
    return validCurrency || DEFAULT_CURRENCY
  } catch (e) {
    console.error("Failed to read currency preference", e)
    return DEFAULT_CURRENCY
  }
}

const currencyStore = proxy<CurrencyStore>({
  availableCurrencies: ["USD"],
  selectedCurrency: getInitialCurrency(),
  rates: {
    USD: 1,
    BTC: null,
    ETH: null,
    EUR: null,
  },
})

const refreshCurrencyRates = () => {
  const prices = pricesStore.prices
  if (!prices) return
  try {
    const btcPrice = safeParsePrice(
      prices.getNativeBy({ chainId: BITCOIN_CHAIN_ID }),
    )
    const ethPrice = safeParsePrice(
      prices.getNativeBy({ chainId: ETHEREUM_CHAIN_ID }),
    )

    let eurPrice = safeParsePrice(
      prices.getBy({
        chainId: ETHEREUM_CHAIN_ID,
        address: "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c",
      }),
    )

    // Fallback to CELO price if EUR price is not available
    if (!eurPrice) {
      eurPrice = safeParsePrice(
        prices.getBy({
          chainId: CELO_CHAIN_ID,
          address: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
        }),
      )
    }

    currencyStore.rates.USD = 1
    currencyStore.rates.BTC = calculateExchangeRate(btcPrice)
    currencyStore.rates.ETH = calculateExchangeRate(ethPrice)
    currencyStore.rates.EUR = calculateExchangeRate(eurPrice)

    const availableCurrencies: CurrencyCode[] = []
    for (const currency of SUPPORTED_CURRENCIES) {
      const rate = currencyStore.rates[currency]
      if (rate !== null) {
        availableCurrencies.push(currency)
      }
    }
    currencyStore.availableCurrencies = availableCurrencies
  } catch (e) {
    console.error("Failed to update currency rates", e)
  }
}
// Update exchange rates when prices change
subscribeKey(pricesStore, "prices", refreshCurrencyRates)

// Initialize exchange rates on startup
refreshCurrencyRates()

// Save currency preference
subscribeKey(currencyStore, "selectedCurrency", (currency) => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
  } catch (e) {
    console.error("Failed to save currency preference", e)
  }
})

export type SelectedCurrency = {
  currency: CurrencyCode
  symbol: string
  usdExchangeRate: number
}

export const selectCurrency = (currency: CurrencyCode): void => {
  if (currencyStore.availableCurrencies.includes(currency)) {
    const prev = currencyStore.selectedCurrency
    if (prev !== currency) {
      captureEvent({
        type: AnalyticsEventTypes.CurrencySelected,
        currency,
        previousCurrency: prev,
      })
    }
    currencyStore.selectedCurrency = currency
  } else {
    console.warn(`Invalid currency: ${currency}. Using default.`)
    currencyStore.selectedCurrency = DEFAULT_CURRENCY
  }
}

export const useSelectedCurrency = (): SelectedCurrency => {
  const snapshot = useSnapshot(currencyStore)
  const currency = snapshot.selectedCurrency
  const symbol = CURRENCY_SYMBOLS[snapshot.selectedCurrency]
  const usdExchangeRate = snapshot.rates[snapshot.selectedCurrency] || 0
  return { currency, symbol, usdExchangeRate }
}

export const useAvailableCurrencies = (): readonly CurrencyCode[] => {
  const snapshot = useSnapshot(currencyStore)
  return snapshot.availableCurrencies
}
