import { AVAILABLE_CHAINS } from "@/chain/chains"
import type { TokenInfo } from "@/tokens/types"

import { NormalizedAddressMap } from "../NormalizedAddressMap"

type ChainId = number
type Address = string
type Token = TokenInfo & { priceUSD?: string }

type TokensResponse = {
  tokens: { [chainId: string]: Array<Token & { address: string }> }
}

export async function getTokens(): Promise<Map<ChainId, Map<Address, Token>>> {
  const tokensResponse = await fetch(`/api/tokens`)
  if (tokensResponse.status >= 400) {
    throw Error(
      `lifi getTokens request http error code: ${tokensResponse.status}`,
    )
  }

  const { tokens: tokensLifi } = (await tokensResponse.json()) as TokensResponse
  const tokens = new Map<ChainId, Map<Address, Token>>()
  for (const chainIdString in tokensLifi) {
    const tokensOfChainLifi = tokensLifi[chainIdString]
    const chainId = parseInt(chainIdString)
    const chain = AVAILABLE_CHAINS.get(chainId)
    if (!chain) {
      continue
    }
    const tokensOfChain = new NormalizedAddressMap<Address, Token>(chain.family)
    for (const token of tokensOfChainLifi) {
      tokensOfChain.set(token.address, token)
    }
    tokens.set(chainId, tokensOfChain)
  }
  return tokens
}
