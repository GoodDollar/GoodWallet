// /api/tokens

import { NextResponse } from "next/server"
import type { TokensResponse } from "@lifi/sdk"

import { AnalyticsEventTypes } from "@/analytics/types"

import { capture } from "../tracking/amplitude"
import { dbContext } from "./dbContext"
import { getTokensFromLiFi } from "./lifiUtils"
import {
  addFallbackTokens,
  mutateApplyBlacklist,
  mutateApplyBlacklistForMarketCap,
  mutateRemoveUnavailableChains,
} from "./tokenUtils"
import type {
  StorageContext,
  TokensClientResponse,
  UpsertTokens,
} from "./types"

export const dynamic = "force-static"
export const revalidate = 3600 // 1 hour

const headers = {
  headers: {
    "Cache-Control": `public, max-age=${revalidate}`,
  },
}

export async function GET() {
  try {
    try {
      await updateTokens(dbContext)
    } catch (e) {
      console.log("Could not update tokens", e)
    }
    const tokens = await getTokens(dbContext)

    //We remove as much as possible, to reduce payload size
    const tokensResponse: TokensClientResponse = {}
    for (const chainId in tokens) {
      tokensResponse[chainId] = tokens[chainId].map(
        ({ chainId, updatedAt, logoURI, ...rest }) => rest,
      )
    }

    const amountOfTokens = Object.values(tokensResponse).reduce(
      (total, tokensPerChain) => (total += tokensPerChain.length),
      0,
    )

    capture({
      type: AnalyticsEventTypes.TokensSavedPerChain,
      amountOfTokens,
    })

    return NextResponse.json({ tokens: tokensResponse }, headers)
  } catch (e: unknown) {
    console.error(e)
    return Response.json({ message: "Failed to process request", error: e })
  }
}

const getTokens = async (context: Pick<StorageContext, "getAll">) => {
  const tokens = await context.getAll()
  mutateApplyBlacklist(tokens)
  mutateRemoveUnavailableChains(tokens)
  mutateApplyBlacklistForMarketCap(tokens)

  // Sort by market cap descendingly
  for (const chainId in tokens) {
    tokens[chainId].sort(
      (a, b) => (b.marketCapUSD ?? 0) - (a.marketCapUSD ?? 0),
    )
  }
  return tokens
}

const updateTokens = async (context: Pick<StorageContext, "upsert">) => {
  const tokensResponseFromLifi = await getTokensFromLiFi()
  await addFallbackTokens(tokensResponseFromLifi)
  const upsertTokens = convertFromLiFiToUpsert(tokensResponseFromLifi)
  await context.upsert(upsertTokens)
}

const convertFromLiFiToUpsert = (tokens: TokensResponse): UpsertTokens => {
  const now = Date.now()
  const res: UpsertTokens = {}

  for (const [chainId, tokensInChain] of Object.entries(tokens.tokens)) {
    for (const token of tokensInChain) {
      if (!res[chainId]) {
        res[chainId] = []
      }
      res[chainId].push({
        ...token,
        logoURI: token.logoURI?.trim(),
        priceUSD: token.priceUSD.trim().length === 0 ? null : token.priceUSD,
        updatedAt: now,
      })
    }
  }
  return res
}
