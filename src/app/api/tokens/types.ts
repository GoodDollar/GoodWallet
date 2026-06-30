import type { tokensTable } from "../database/schema"

export type UpsertToken = typeof tokensTable.$inferInsert
export type UpsertTokens = { [chainId: string]: Array<UpsertToken> }

export type SelectToken = typeof tokensTable.$inferSelect
export type SelectTokens = { [chainId: string]: Array<SelectToken> }

export type TokenClientResponse = Omit<
  SelectToken,
  "marketCapUSD" | "volumeUSD24H" | "chainId" | "updatedAt" | "logoURI"
>
export type TokensClientResponse = {
  [chainId: string]: Array<TokenClientResponse>
}

export type StorageContext = {
  upsert: (tokens: UpsertTokens) => Promise<unknown>
  getAll: () => Promise<SelectTokens>
  getToken: (chainId: number, address: string) => Promise<SelectToken>
}
