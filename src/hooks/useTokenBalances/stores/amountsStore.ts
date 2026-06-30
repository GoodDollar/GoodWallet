import type { FixedNumber } from "ethers"
import { imap } from "itertools"
import { proxy } from "valtio"
import { proxyMap, subscribeKey } from "valtio/utils"

import { getChainProvider } from "@/chain/provider/provider"
import { sessionState } from "@/login/context/SessionContext/storage"
import type { Addresses } from "@/login/types"
import type { Tokens } from "@/tokens/types"

import type { NormalizedAddressMap } from "../NormalizedAddressMap"
import { focusStore } from "./focusStore"
import { tokensStore } from "./tokensStore"

const AMOUNTS_REFRESH_INTERVAL_MS = 1000 * 60 * 3

type AmountsStore = {
  amounts: Map<number, NormalizedAddressMap<string, FixedNumber>>
  isLoading: boolean
  isValidating: boolean
  lastRefreshAllTimestamp: number
}

export const amountsStore = proxy<AmountsStore>({
  amounts: proxyMap(),
  isLoading: true,
  isValidating: false,
  lastRefreshAllTimestamp: 0,
})

export type TokensOfChain = NonNullable<ReturnType<Tokens["get"]>>

async function getAmountsForChain(
  tokensOfChain: TokensOfChain,
  addresses: Addresses,
  chainId: number,
): Promise<NormalizedAddressMap<string, FixedNumber>> {
  const provider = getChainProvider(chainId)
  const address = addresses.get(provider.family)
  if (!address) {
    throw new Error(`Address not found for chainId ${chainId}`)
  }
  return provider.getAmounts(chainId, tokensOfChain, address)
}

export const refreshAmounts = async (
  tokens: Tokens | undefined,
  addresses: Addresses | undefined,
  chainId: number | "all",
) => {
  if (!tokens || !addresses) {
    amountsStore.amounts.clear()
    amountsStore.isLoading = true
    return
  }

  try {
    amountsStore.isValidating = true
    if (chainId === "all") {
      const promises = imap(
        tokens.entries(),
        async ([chainId, tokensOfChain]) =>
          getAmountsForChain(tokensOfChain, addresses, chainId).then(
            (amounts) => {
              amountsStore.amounts.set(chainId, amounts)
            },
          ),
      )
      const r = await Promise.allSettled(promises)
      //Log errors, if any
      r.filter((p) => p.status === "rejected").forEach((p) =>
        console.error(p.reason),
      )
    } else {
      const tokensOfChain = tokens.get(chainId)
      if (tokensOfChain) {
        const amountsForChain = await getAmountsForChain(
          tokensOfChain,
          addresses,
          chainId,
        )
        amountsStore.amounts.set(chainId, amountsForChain)
      }
    }
  } finally {
    amountsStore.isLoading = false
    amountsStore.isValidating = false
  }
}
refreshAmounts(tokensStore.tokens, sessionState.addresses, "all")
subscribeKey(tokensStore, "tokens", (tokens) => {
  refreshAmounts(tokens, sessionState.addresses, "all")
})

subscribeKey(sessionState, "addresses", (addresses) => {
  refreshAmounts(tokensStore.tokens, addresses, "all")
})

setInterval(() => {
  const now = Date.now()

  if (!focusStore.isWalletInFocus) {
    return
  }

  if (
    now - amountsStore.lastRefreshAllTimestamp <
    AMOUNTS_REFRESH_INTERVAL_MS
  ) {
    return
  }
  refreshAmounts(tokensStore.tokens, sessionState.addresses, "all")
  amountsStore.lastRefreshAllTimestamp = now
}, 10_000)
