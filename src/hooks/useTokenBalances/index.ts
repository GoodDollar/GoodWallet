"use client"

import { useCallback, useMemo } from "react"
import { useSnapshot } from "valtio"

import { isChainAvailableForAddresses } from "@/chain/chains"
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

  // Hide chains the session has no address for (e.g. non-EVM on connected wallets).
  const availableTokens = useMemo(() => {
    const source = tokensStore.tokens
    if (!tokens || !source || !addresses) return tokens
    const entries = Array.from(source).filter(([chainId]) =>
      isChainAvailableForAddresses(chainId, addresses),
    )
    if (entries.length === source.size) return tokens
    const filtered: Tokens = Object.assign(new Map(entries), {
      getBy: source.getBy,
      getNativeBy: source.getNativeBy,
    })
    return filtered
  }, [tokens, addresses])

  return {
    tokens: availableTokens,
    prices,
    balances,
    isLoading,
    isValidating,
    error: wrappedError,
    mutateBalancesForChain,
  }
}
