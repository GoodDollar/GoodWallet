import type { Prices } from "@/tokens/types"

import * as lifi from "../sdks/lifi"
import { toByChain } from "../utils"

type ChainId = number
type Address = string

export async function getPrices(): Promise<Prices> {
  const pricesLifi: Map<
    ChainId,
    Map<Address, { priceUSD?: string }>
  > = await lifi.getTokens()
  return toByChain(pricesLifi, toPrice)
}

function toPrice(
  _: unknown,
  __: unknown,
  { priceUSD }: { priceUSD?: string },
): string | undefined {
  return priceUSD
}
