import type { Simplify } from "type-fest"

export type BaseTokenIdentifier = {
  readonly chainId: number
  readonly address: string
}

export type TokenIdentifier = Simplify<
  BaseTokenIdentifier & {
    isEqual(other: BaseTokenIdentifier): boolean
  }
>

export type TokenInfo = {
  readonly symbol: string
  readonly decimals: number
  readonly name: string
  readonly marketCapUSD?: number
  readonly volumeUSD24H?: number
  readonly logoURI?: string
}

export type TokenAmount = {
  readonly hasValue: false
  readonly amount: string
}

export type TokenValue = Simplify<
  Omit<TokenAmount, "hasValue"> & {
    readonly hasValue: true
    readonly priceUSD: string
    readonly usdValue: string
  }
>

export type ByChain<T> = ReadonlyMap<
  number,
  ReadonlyMap<string, T> & {
    native: T | undefined
  }
> & {
  /**
   * Info
   * @param {TokenIdentifier} tokenId address is in lowercase
   */
  getBy(tokenId: BaseTokenIdentifier): T | undefined
  getNativeBy(tokenId: Pick<BaseTokenIdentifier, "chainId">): T | undefined
}

export type Tokens = ByChain<TokenIdentifier & TokenInfo>

export type Prices = ByChain<string>

export type TokenBalance = (TokenAmount | TokenValue) & TokenIdentifier
export type BalancesByChain = ByChain<TokenBalance>
