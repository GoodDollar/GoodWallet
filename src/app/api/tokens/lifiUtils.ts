import type { TokensResponse } from "@lifi/sdk"

import { config } from "@/config"
import { lifiChainsStore } from "@/stores/lifiChainsStore"

const RETRY_DELAY_IN_MS = 1000

export const getTokensFromLiFi = async (): Promise<TokensResponse> => {
  const supportedChains = await lifiChainsStore.chainsIds
  const c = config.lifiConfig
  const intersection = supportedChains.filter((chainId) =>
    (c.chainIds as number[]).includes(chainId),
  )

  const params = new URLSearchParams()
  params.set("chains", intersection.join(","))
  params.set("chainTypes", c.chainTypes.join(","))
  params.set("extended", "true")
  params.set("minPriceUSD", "0.00000001") //To get as much tokens as possible, default is 0.0001
  const url = c.apiUrl + "/tokens?" + params.toString()

  const liFiAPIResponse = await fetchWithRetry(url, RETRY_DELAY_IN_MS)
  if (!liFiAPIResponse) {
    throw Error(`lifi API were unreachable`)
  }

  const parsedData = await liFiAPIResponse.json()

  return parsedData as TokensResponse
}

const fetchWithRetry = async (
  url: string,
  delayInMs: number,
  attempts = 5,
): Promise<Response | undefined> => {
  if (attempts === 0) return undefined

  const response: Response = await fetch(url)
  if (response.status === 200) return response

  await new Promise((resolve) => setTimeout(resolve, delayInMs))
  return fetchWithRetry(url, delayInMs, attempts - 1)
}
