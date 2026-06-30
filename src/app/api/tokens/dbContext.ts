import type { ChainId } from "@lifi/sdk"
import { and, eq, inArray, sql } from "drizzle-orm"

import { AVAILABLE_CHAINS_IDS } from "@/chain/chains"

import { getDB } from "../database/getDb"
import { tokensTable } from "../database/schema"
import type {
  SelectToken,
  SelectTokens,
  StorageContext,
  UpsertTokens,
} from "./types"

// Postgres limits query parameters to 65535, but we use 32K as a safe limit
const MAX_QUERY_PARAMS = 32_000

// Helper function to chunk an array efficiently
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunkCount = Math.ceil(array.length / size)
  const chunks: T[][] = new Array(chunkCount)
  for (let i = 0; i < chunkCount; i++) {
    chunks[i] = array.slice(i * size, (i + 1) * size)
  }
  return chunks
}

export const dbContext: StorageContext = {
  async getAll(): Promise<SelectTokens> {
    const db = await getDB()
    const result = await db
      .select()
      .from(tokensTable)
      .where(inArray(tokensTable.chainId, AVAILABLE_CHAINS_IDS))

    //Arrange into byChainId struct, before returning
    const selectedTokens: SelectTokens = {}
    result.forEach((token) => {
      const { chainId } = token
      if (!selectedTokens[chainId]) {
        selectedTokens[chainId] = [token]
      } else {
        selectedTokens[chainId].push(token)
      }
    })
    return selectedTokens
  },
  async getToken(chainId: ChainId, address: string): Promise<SelectToken> {
    const db = await getDB()
    const r = await db
      .select()
      .from(tokensTable)
      .where(
        and(
          eq(tokensTable.chainId, chainId),
          eq(sql`lower(${tokensTable.address})`, address),
        ),
      )
    if (r.length === 0) {
      throw new Error(`No token found in ${chainId} with address ${address}`)
    }

    return r[0]
  },
  async upsert(newTokens: UpsertTokens) {
    /**
     * Postgres limits the number of query params to 65535, so we process each chain separately
     * instead of one big array.
     * Additionally, we chunk insertions based on query parameter limits since each token uses
     * multiple query parameters (one per field in the INSERT VALUES clause).
     */
    const db = await getDB()

    // Calculate params per token dynamically from the first available token
    const firstTokenArray = Object.values(newTokens).find(
      (tokens) => tokens && tokens.length > 0,
    )
    const paramsPerToken =
      firstTokenArray && firstTokenArray.length > 0
        ? Object.keys(firstTokenArray[0]).length
        : 10 // Fallback to 10 if no tokens available
    const chunkSize = Math.floor(MAX_QUERY_PARAMS / paramsPerToken)

    // Coalesce updates to preserve existing values when new values are null
    // Reference excluded table columns - use sql.raw for the entire excluded reference
    const excludedMarketCapUSD = sql.raw(
      `excluded."${tokensTable.marketCapUSD.name}"`,
    )
    const excludedVolumeUSD24H = sql.raw(
      `excluded."${tokensTable.volumeUSD24H.name}"`,
    )
    const excludedUpdatedAt = sql.raw(
      `excluded."${tokensTable.updatedAt.name}"`,
    )
    const excludedLogoURI = sql.raw(`excluded."${tokensTable.logoURI.name}"`)
    const excludedPriceUSD = sql.raw(`excluded."${tokensTable.priceUSD.name}"`)
    const excludedName = sql.raw(`excluded."${tokensTable.name.name}"`)
    const excludedSymbol = sql.raw(`excluded."${tokensTable.symbol.name}"`)
    const excludedDecimals = sql.raw(`excluded."${tokensTable.decimals.name}"`)

    // Collect all promises from all chains and chunks
    const allPromises = Object.values(newTokens).flatMap((tokens) => {
      if (!tokens || tokens.length === 0) {
        return []
      }
      // Chunk tokens based on query parameter limits (each token uses multiple params)
      const tokenChunks = chunkArray(tokens, chunkSize)

      // Process each chunk separately
      return tokenChunks.map((chunk) =>
        db
          .insert(tokensTable)
          .values(chunk)
          .onConflictDoUpdate({
            target: [tokensTable.chainId, tokensTable.address],
            set: {
              // Use COALESCE to preserve existing values when new values are null
              marketCapUSD: sql`COALESCE(${excludedMarketCapUSD}, ${tokensTable.marketCapUSD})`,
              volumeUSD24H: sql`COALESCE(${excludedVolumeUSD24H}, ${tokensTable.volumeUSD24H})`,
              updatedAt: excludedUpdatedAt,
              logoURI: sql`COALESCE(${excludedLogoURI}, ${tokensTable.logoURI})`,
              priceUSD: sql`COALESCE(${excludedPriceUSD}, ${tokensTable.priceUSD})`,
              // Update other fields that should always be overwritten
              name: excludedName,
              symbol: excludedSymbol,
              decimals: excludedDecimals,
            },
          }),
      )
    })

    await Promise.all(allPromises)
  },
}
