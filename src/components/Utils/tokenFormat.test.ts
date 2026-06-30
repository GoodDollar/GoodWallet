import { describe, expect, it } from "vitest"

import type { SelectedCurrency } from "@/stores/currencyStore"

import {
  formatTokenAmount,
  formatTokenPrice,
  formatTokenValue,
} from "./tokenFormat"

describe("tokenFormat", () => {
  describe("formatTokenAmount", () => {
    it("should format zero amount", () => {
      expect(formatTokenAmount(0, "G$")).toBe("0 G$")
    })

    it("should format integer amounts", () => {
      expect(formatTokenAmount(1, "G$")).toBe("1 G$")
      expect(formatTokenAmount(100, "G$")).toBe("100 G$")
      expect(formatTokenAmount(1000, "G$")).toBe("1K G$")
      expect(formatTokenAmount(1000000, "G$")).toBe("1M G$")
    })

    it("should format amounts >= 1 with 2 decimals", () => {
      expect(formatTokenAmount(1.5, "G$")).toBe("1.5 G$")
      expect(formatTokenAmount(10.99, "G$")).toBe("10.99 G$")
      expect(formatTokenAmount(100.123, "G$")).toBe("100.12 G$")
    })

    it("should format amounts >= 0.1 with 3 decimals", () => {
      expect(formatTokenAmount(0.1, "G$")).toBe("0.1 G$")
      expect(formatTokenAmount(0.5, "G$")).toBe("0.5 G$")
      expect(formatTokenAmount(0.99, "G$")).toBe("0.99 G$")
      expect(formatTokenAmount(0.123, "G$")).toBe("0.123 G$")
    })

    it("should format amounts >= 0.01 with 4 decimals", () => {
      expect(formatTokenAmount(0.01, "G$")).toBe("0.01 G$")
      expect(formatTokenAmount(0.05, "G$")).toBe("0.05 G$")
      expect(formatTokenAmount(0.099, "G$")).toBe("0.099 G$")
      expect(formatTokenAmount(0.0123, "G$")).toBe("0.0123 G$")
    })

    it("should format amounts >= 0.001 with 5 decimals", () => {
      expect(formatTokenAmount(0.001, "G$")).toBe("0.001 G$")
      expect(formatTokenAmount(0.005, "G$")).toBe("0.005 G$")
      expect(formatTokenAmount(0.0099, "G$")).toBe("0.0099 G$")
      expect(formatTokenAmount(0.00123, "G$")).toBe("0.00123 G$")
    })

    it("should format amounts >= 0.0001 with 6 decimals", () => {
      expect(formatTokenAmount(0.0001, "G$")).toBe("0.0001 G$")
      expect(formatTokenAmount(0.0005, "G$")).toBe("0.0005 G$")
      expect(formatTokenAmount(0.00099, "G$")).toBe("0.00099 G$")
      expect(formatTokenAmount(0.000123, "G$")).toBe("0.000123 G$")
    })

    it("should format amounts >= 0.00001 with 7 decimals", () => {
      expect(formatTokenAmount(0.00001, "G$")).toBe("0.00001 G$")
      expect(formatTokenAmount(0.00005, "G$")).toBe("0.00005 G$")
      expect(formatTokenAmount(0.000099, "G$")).toBe("0.000099 G$")
    })

    it("should format amounts >= 0.000001 with 8 decimals", () => {
      expect(formatTokenAmount(0.000001, "G$")).toBe("0.000001 G$")
      expect(formatTokenAmount(0.000005, "G$")).toBe("0.000005 G$")
    })

    it("should format amounts >= 0.0000001 with 9 decimals", () => {
      expect(formatTokenAmount(0.0000001, "G$")).toBe("0.0000001 G$")
      expect(formatTokenAmount(0.0000005, "G$")).toBe("0.0000005 G$")
    })

    it("should format amounts < 0.0000001 with 10 decimals", () => {
      expect(formatTokenAmount(0.00000001, "G$")).toBe("0.00000001 G$")
      expect(formatTokenAmount(0.00000005, "G$")).toBe("0.00000005 G$")
    })

    it("should handle string inputs", () => {
      expect(formatTokenAmount("1.5", "G$")).toBe("1.5 G$")
      expect(formatTokenAmount("0.001", "G$")).toBe("0.001 G$")
      expect(formatTokenAmount("1000", "G$")).toBe("1K G$")
    })

    it("should handle negative amounts", () => {
      expect(formatTokenAmount(-1, "G$")).toBe("-1 G$")
      expect(formatTokenAmount(-0.1, "G$")).toBe("-0.1 G$")
      expect(formatTokenAmount(-0.001, "G$")).toBe("-0.001 G$")
    })

    it("should use compact notation for large numbers", () => {
      expect(formatTokenAmount(1500, "G$")).toBe("1.5K G$")
      expect(formatTokenAmount(1500000, "G$")).toBe("1.5M G$")
      expect(formatTokenAmount(1500000000, "G$")).toBe("1.5B G$")
    })

    it("should handle different token symbols", () => {
      expect(formatTokenAmount(100, "ETH")).toBe("100 ETH")
      expect(formatTokenAmount(100, "BTC")).toBe("100 BTC")
      expect(formatTokenAmount(100, "USDC")).toBe("100 USDC")
    })

    it("should strip trailing zeros for integers", () => {
      expect(formatTokenAmount(100.0, "G$")).toBe("100 G$")
      expect(formatTokenAmount(1.0, "G$")).toBe("1 G$")
    })
  })

  describe("formatTokenPrice", () => {
    const usdCurrency: SelectedCurrency = {
      currency: "USD",
      symbol: "$",
      usdExchangeRate: 1,
    }

    const eurCurrency: SelectedCurrency = {
      currency: "EUR",
      symbol: "€",
      usdExchangeRate: 0.85,
    }

    const btcCurrency: SelectedCurrency = {
      currency: "BTC",
      symbol: "₿",
      usdExchangeRate: 0.000025,
    }

    const ethCurrency: SelectedCurrency = {
      currency: "ETH",
      symbol: "Ξ",
      usdExchangeRate: 0.0004,
    }

    it("should format USD price in USD currency", () => {
      expect(formatTokenPrice(1, usdCurrency)).toBe("$1.00")
      expect(formatTokenPrice(10, usdCurrency)).toBe("$10.00")
      expect(formatTokenPrice(100, usdCurrency)).toBe("$100.00")
      expect(formatTokenPrice(0.5, usdCurrency)).toBe("$0.50")
    })

    it("should format USD price in EUR currency", () => {
      expect(formatTokenPrice(1, eurCurrency)).toBe("€0.85")
      expect(formatTokenPrice(100, eurCurrency)).toBe("€85.00")
      expect(formatTokenPrice(10, eurCurrency)).toBe("€8.50")
    })

    it("should format USD price in BTC currency", () => {
      expect(formatTokenPrice(40000, btcCurrency)).toBe("₿\u00A01.00")
      expect(formatTokenPrice(1000, btcCurrency)).toBe("₿\u00A00.025")
      expect(formatTokenPrice(100, btcCurrency)).toBe("₿\u00A00.0025")
    })

    it("should format USD price in ETH currency", () => {
      expect(formatTokenPrice(2500, ethCurrency)).toBe("Ξ\u00A01.00")
      expect(formatTokenPrice(100, ethCurrency)).toBe("Ξ\u00A00.04")
      expect(formatTokenPrice(10, ethCurrency)).toBe("Ξ\u00A00.004")
    })

    it("should handle string inputs", () => {
      expect(formatTokenPrice("1", usdCurrency)).toBe("$1.00")
      expect(formatTokenPrice("100", eurCurrency)).toBe("€85.00")
      expect(formatTokenPrice("40000", btcCurrency)).toBe("₿\u00A01.00")
    })

    it("should use compact notation for large prices", () => {
      expect(formatTokenPrice(1000, usdCurrency)).toBe("$1.00K")
      expect(formatTokenPrice(1000000, usdCurrency)).toBe("$1.00M")
      expect(formatTokenPrice(1000000000, usdCurrency)).toBe("$1.00B")
    })

    it("should format small prices with appropriate decimals", () => {
      expect(formatTokenPrice(0.01, usdCurrency)).toBe("$0.01")
      expect(formatTokenPrice(0.001, usdCurrency)).toBe("$0.001")
      expect(formatTokenPrice(0.0001, usdCurrency)).toBe("$0.0001")
    })

    it("should format zero price", () => {
      expect(formatTokenPrice(0, usdCurrency)).toBe("$0.00")
      expect(formatTokenPrice(0, eurCurrency)).toBe("€0.00")
    })

    it("should handle negative prices", () => {
      expect(formatTokenPrice(-1, usdCurrency)).toBe("-$1.00")
      expect(formatTokenPrice(-100, eurCurrency)).toBe("-€85.00")
    })

    it("should always show at least 2 decimal places for currency", () => {
      expect(formatTokenPrice(1, usdCurrency)).toBe("$1.00")
      expect(formatTokenPrice(10, usdCurrency)).toBe("$10.00")
      expect(formatTokenPrice(100, usdCurrency)).toBe("$100.00")
    })

    it("should replace currency code with symbol", () => {
      // The function replaces the currency code with the symbol
      // So "USD" should be replaced with "$"
      const result = formatTokenPrice(1, usdCurrency)
      expect(result).not.toContain("USD")
      expect(result).toContain("$")
    })
  })

  describe("formatTokenValue", () => {
    const usdCurrency: SelectedCurrency = {
      currency: "USD",
      symbol: "$",
      usdExchangeRate: 1,
    }

    const eurCurrency: SelectedCurrency = {
      currency: "EUR",
      symbol: "€",
      usdExchangeRate: 0.85,
    }

    const btcCurrency: SelectedCurrency = {
      currency: "BTC",
      symbol: "₿",
      usdExchangeRate: 0.000025,
    }

    const ethCurrency: SelectedCurrency = {
      currency: "ETH",
      symbol: "Ξ",
      usdExchangeRate: 0.0004,
    }

    it("should format USD value in USD currency", () => {
      expect(formatTokenValue(1, usdCurrency)).toBe("$1.00")
      expect(formatTokenValue(10, usdCurrency)).toBe("$10.00")
      expect(formatTokenValue(100, usdCurrency)).toBe("$100.00")
      expect(formatTokenValue(1000, usdCurrency)).toBe("$1.00K")
    })

    it("should format USD value in EUR currency", () => {
      expect(formatTokenValue(1, eurCurrency)).toBe("€0.85")
      expect(formatTokenValue(100, eurCurrency)).toBe("€85.00")
      expect(formatTokenValue(1000, eurCurrency)).toBe("€850.00")
    })

    it("should format USD value in BTC currency", () => {
      expect(formatTokenValue(40000, btcCurrency)).toBe("₿\u00A01.000000")
      expect(formatTokenValue(1000, btcCurrency)).toBe("₿\u00A00.025000")
      expect(formatTokenValue(100, btcCurrency)).toBe("₿\u00A00.002500")
    })

    it("should format USD value in ETH currency", () => {
      expect(formatTokenValue(2500, ethCurrency)).toBe("Ξ\u00A01.00000")
      expect(formatTokenValue(100, ethCurrency)).toBe("Ξ\u00A00.04000")
      expect(formatTokenValue(10, ethCurrency)).toBe("Ξ\u00A00.00400")
    })

    it("should handle string inputs", () => {
      expect(formatTokenValue("1", usdCurrency)).toBe("$1.00")
      expect(formatTokenValue("100", eurCurrency)).toBe("€85.00")
      expect(formatTokenValue("40000", btcCurrency)).toBe("₿\u00A01.000000")
    })

    it("should use compact notation for large values", () => {
      expect(formatTokenValue(1000, usdCurrency)).toBe("$1.00K")
      expect(formatTokenValue(1000000, usdCurrency)).toBe("$1.00M")
      expect(formatTokenValue(1000000000, usdCurrency)).toBe("$1.00B")
    })

    it("should format zero value", () => {
      expect(formatTokenValue(0, usdCurrency)).toBe("$0.00")
      expect(formatTokenValue(0, eurCurrency)).toBe("€0.00")
    })

    it("should handle negative values", () => {
      expect(formatTokenValue(-1, usdCurrency)).toBe("-$1.00")
      expect(formatTokenValue(-100, eurCurrency)).toBe("-€85.00")
    })

    it("should calculate decimals based on exchange rate", () => {
      // For USD (rate = 1), decimals should be max(2, getDecimals(1) - 1) = max(2, 2-1) = max(2, 1) = 2
      expect(formatTokenValue(1.123, usdCurrency)).toBe("$1.12")

      // For EUR (rate = 0.85), decimals should be max(2, getDecimals(0.85) - 1) = max(2, 3-1) = max(2, 2) = 2
      expect(formatTokenValue(1.123, eurCurrency)).toBe("€0.95")

      // For BTC (rate = 0.000025), decimals should be max(2, getDecimals(0.000025) - 1) = max(2, 7-1) = max(2, 6) = 6
      // getDecimals(0.000025) = 7 (since 0.000025 >= 0.00001 and < 0.0001)
      expect(formatTokenValue(1, btcCurrency)).toBe("₿\u00A00.000025")
    })

    it("should use fixed decimals based on exchange rate precision", () => {
      // The function uses fixed decimals, so values should be rounded to that precision
      const smallBtcRate: SelectedCurrency = {
        currency: "BTC",
        symbol: "₿",
        usdExchangeRate: 0.00000001, // Very small rate
      }
      // decimals = max(2, getDecimals(0.00000001) - 1) = max(2, 10-1) = max(2, 9) = 9
      expect(formatTokenValue(1, smallBtcRate)).toBe("₿\u00A00.000000010")
    })

    it("should always show at least 2 decimal places", () => {
      const highRate: SelectedCurrency = {
        currency: "USD",
        symbol: "$",
        usdExchangeRate: 100, // High rate
      }
      // decimals = max(2, getDecimals(100) - 1) = max(2, 2-1) = max(2, 1) = 2
      expect(formatTokenValue(1, highRate)).toBe("$100.00")
    })

    it("should replace currency code with symbol", () => {
      const result = formatTokenValue(1, usdCurrency)
      expect(result).not.toContain("USD")
      expect(result).toContain("$")
    })

    it("should handle very small exchange rates", () => {
      const tinyRate: SelectedCurrency = {
        currency: "BTC",
        symbol: "₿",
        usdExchangeRate: 0.000000001,
      }
      // decimals = max(2, getDecimals(0.000000001) - 1) = max(2, 10-1) = 9
      expect(formatTokenValue(1, tinyRate)).toBe("₿\u00A00.000000001")
    })

    it("should handle very large exchange rates", () => {
      const largeRate: SelectedCurrency = {
        currency: "USD",
        symbol: "$",
        usdExchangeRate: 1000,
      }
      // decimals = max(2, getDecimals(1000) - 1) = max(2, 2-1) = 2
      expect(formatTokenValue(1, largeRate)).toBe("$1.00K")
    })
  })
})
