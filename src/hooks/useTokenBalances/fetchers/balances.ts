import type { FixedNumber } from "ethers"
import { flatmap, sorted } from "itertools"

import { parseAmount } from "ethers-utils/utils"
import type { BalancesByChain, Prices, TokenBalance } from "@/tokens/types"

import { isEqual, toByChain } from "../utils"

type ChainId = number
type Address = string

export type Balances = {
  readonly byChain: BalancesByChain
  readonly byUsdValue: ReadonlyArray<TokenBalance>
  readonly aggregatedUsdValue: string
}

/**
 * Mutates balances
 */
export function getBalances(
  amounts: ReadonlyMap<ChainId, ReadonlyMap<Address, FixedNumber>>,
  prices: Prices | undefined,
): Balances {
  const byChain: Balances["byChain"] = toByChain(
    amounts,
    (chainId, address, balance): TokenBalance | undefined => {
      const priceUSD = prices?.get(chainId)?.get(address)
      const usdValue = priceUSD
        ? parseAmount(priceUSD).mul(balance).toString()
        : undefined

      const amount = balance.toString()
      return priceUSD && usdValue
        ? ({
            chainId,
            address,
            amount,
            hasValue: true,
            priceUSD,
            usdValue,
            isEqual,
          } as const)
        : ({ chainId, address, amount, hasValue: false, isEqual } as const)
    },
  )

  // Balances sorted by USD value
  const byUsdValue: Balances["byUsdValue"] = sorted(
    flatmap(byChain.values(), (t) => t.values()),
    (t) => Number(t.hasValue ? t.usdValue : "0"),
    true,
  )

  // Aggregated USD Value
  let aggUsdValueFixedNumber = parseAmount(0)
  for (const t of byUsdValue) {
    if (t.hasValue) {
      aggUsdValueFixedNumber = aggUsdValueFixedNumber.add(
        parseAmount(t.usdValue),
      )
    }
  }
  const aggregatedUsdValue: Balances["aggregatedUsdValue"] =
    aggUsdValueFixedNumber.toString()

  return { byChain, byUsdValue, aggregatedUsdValue }
}
