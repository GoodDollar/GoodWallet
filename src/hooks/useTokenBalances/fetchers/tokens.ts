import type { TokenIdentifier, TokenInfo, Tokens } from "@/tokens/types"

import * as lifi from "../sdks/lifi"
import { isEqual, toByChain } from "../utils"

export async function getTokens(): Promise<Tokens> {
  const tokensLifi = await lifi.getTokens()
  return toByChain(tokensLifi, toToken)
}

/**
 * Mutates token input
 */
function toToken(
  chainId: number,
  address: string,
  token: TokenInfo,
): TokenInfo & TokenIdentifier {
  return Object.assign(token, { chainId, address, isEqual })
}
