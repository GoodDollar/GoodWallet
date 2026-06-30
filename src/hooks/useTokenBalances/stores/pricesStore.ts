import { proxy } from "valtio"
import { subscribeKey } from "valtio/utils"

import type { Prices } from "@/tokens/types"

import { getPrices } from "../fetchers/prices"
import { tokensStore } from "./tokensStore"

type PricesStore = {
  prices: Prices | undefined
  isLoading: boolean
  isValidating: boolean
  error: unknown | undefined
}

export const pricesStore = proxy<PricesStore>({
  prices: undefined,
  isLoading: true,
  isValidating: false,
  error: undefined,
})

//Wait for tokens to be fetched, to make sure the prices request will be served from cache
subscribeKey(tokensStore, "tokens", async (tokens) => {
  if (!tokens) {
    pricesStore.prices = undefined
    pricesStore.error = undefined
  }
  pricesStore.isValidating = true
  try {
    pricesStore.prices = await getPrices()
    pricesStore.error = undefined
  } catch (error) {
    console.error("Error fetching prices", error)
    pricesStore.error = error
  } finally {
    pricesStore.isLoading = false
    pricesStore.isValidating = false
  }
})
