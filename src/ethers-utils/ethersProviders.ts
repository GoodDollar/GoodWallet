import { type AbstractProvider, JsonRpcProvider } from "ethers/providers"

import { rpcUrls } from "./config"

const cache: Map<number, AbstractProvider> = new Map()

/**
 * @deprecated Use getViemClient instead
 */
export const getEthersProvider = (chainId: number): AbstractProvider => {
  if (Object.entries(rpcUrls).length === 0) {
    throw new Error(`No RPC-URLs configured`)
  }

  const cachedElement = cache.get(chainId)
  if (cachedElement) {
    return cachedElement
  }

  const chain = String(chainId)
  const rpcUrl = rpcUrls[chain]

  if (!rpcUrl) {
    throw new Error(`Chain ID '${chainId}' is not supported`)
  }

  const provider = new JsonRpcProvider(rpcUrl, chainId, { staticNetwork: true })
  cache.set(chainId, provider)
  return provider
}
