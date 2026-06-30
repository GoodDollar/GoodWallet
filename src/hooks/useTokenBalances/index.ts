"use client"

import { useCallback } from "react"
import { useSnapshot } from "valtio"

import { sessionState } from "@/login/context/SessionContext/storage"
import type { Prices, Tokens } from "@/tokens/types"

import type { Balances } from "./fetchers/balances"
import { amountsStore, refreshAmounts } from "./stores/amountsStore"
import { balancesStore } from "./stores/balancesStore"
import { pricesStore } from "./stores/pricesStore"
import { tokensStore } from "./stores/tokensStore"

export function useTokenBalances(): {
  isLoading: boolean
  isValidating: boolean
  tokens: Tokens | undefined
  prices: Prices | undefined
  balances: Balances | undefined
  error: Error | undefined
  mutateBalancesForChain: (chainId: number) => void
} {
  const {
    tokens,
    isLoading: isTokensLoading,
    isValidating: isTokensValidating,
    error: tokensError,
  } = useSnapshot(tokensStore)
  const {
    prices,
    isLoading: isPricesLoading,
    isValidating: isPricesValidating,
    error: pricesError,
  } = useSnapshot(pricesStore)
  const addresses = useSnapshot(sessionState).addresses
  const { isValidating: isAmountsValidating, isLoading: isAmountsLoading } =
    useSnapshot(amountsStore)

  const { balances } = useSnapshot(balancesStore)

  const isLoading = isTokensLoading || isPricesLoading || isAmountsLoading
  const isValidating =
    isTokensValidating || isPricesValidating || isAmountsValidating

  const error = tokensError || pricesError

  const wrappedError =
    error === undefined
      ? undefined
      : error instanceof Error
        ? error
        : new Error("Unknown Error : " + error)

  const mutateBalancesForChain = useCallback(
    (chainId: number) => refreshAmounts(tokens, addresses, chainId),
    [tokens, addresses],
  )

  return {
    tokens,
    prices,
    balances,
    isLoading,
    isValidating,
    error: wrappedError,
    mutateBalancesForChain,
  }
}
