import { proxy } from "valtio"

import type { Tokens } from "@/tokens/types"

import { getTokens } from "../fetchers/tokens"

const TOKENS_REFRESH_INTERVAL_MS = 1000 * 60 * 60

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
setInterval(refreshTokens, TOKENS_REFRESH_INTERVAL_MS)
