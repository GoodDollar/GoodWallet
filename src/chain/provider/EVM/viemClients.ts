import { createPublicClient, http, type PublicClient } from "viem"

import { AVAILABLE_CHAINS } from "@/chain/chains"
import { rpcUrls } from "@/ethers-utils/config"

const cache: Map<string, PublicClient> = new Map()

export const getViemClient = (
  chainId: number,
  rpcUrl?: string,
): PublicClient => {
  const effectiveRpcUrl = rpcUrl ?? rpcUrls[String(chainId)]
  const cacheKey = `${chainId}-${effectiveRpcUrl ?? "default"}`
  const cachedElement = cache.get(cacheKey)
  if (cachedElement) {
    return cachedElement
  }

  const chain = AVAILABLE_CHAINS.get(chainId)
  if (!chain) {
    throw new Error(`Chain ID '${chainId}' is not supported`)
  }

  const client = createPublicClient({
    chain,
    transport: http(effectiveRpcUrl, {
      retryCount: 3,
      retryDelay: 1000,
    }),
  })
  cache.set(cacheKey, client)
  return client
}
