import { proxy } from "valtio"
import { subscribeKey } from "valtio/utils"

import type { Tokens } from "@/tokens/types"

import { getTokens } from "../fetchers/tokens"
import { focusStore } from "./focusStore"
import { inactivityStore } from "./inactivityStore"

const TOKENS_REFRESH_INTERVAL_MS = 1000 * 60 * 60
let nextRefreshAt = Date.now() + TOKENS_REFRESH_INTERVAL_MS

type TokensStore = {
  tokens: Tokens | undefined
  isLoading: boolean
  isValidating: boolean
  error: unknown | undefined
}

const refreshTokens = async () => {
  if (typeof window == "undefined") return

  tokensStore.isValidating = true
  try {
    tokensStore.tokens = await getTokens()
    tokensStore.error = undefined
  } catch (error) {
    console.error("Error fetching tokens", error)
    tokensStore.error = error
  } finally {
    tokensStore.isLoading = false
    tokensStore.isValidating = false
  }
}

export const tokensStore = proxy<TokensStore>({
  tokens: undefined,
  isLoading: true,
  isValidating: false,
  error: undefined,
})

refreshTokens()
const refreshTokensIfDue = () => {
  if (!focusStore.isWalletInFocus || !inactivityStore.isActive) {
    return
  }

  const now = Date.now()
  if (now < nextRefreshAt) return

  nextRefreshAt = now + TOKENS_REFRESH_INTERVAL_MS
  refreshTokens()
}

setInterval(refreshTokensIfDue, TOKENS_REFRESH_INTERVAL_MS)
subscribeKey(focusStore, "isWalletInFocus", refreshTokensIfDue)
subscribeKey(inactivityStore, "isActive", refreshTokensIfDue)
