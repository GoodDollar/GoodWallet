import type { ChainsResponse } from "@lifi/sdk"
import asyncRetry from "async-retry"
import { proxy } from "valtio"

import { config } from "@/config"

// Fetch chains function
const fetchChains = async (): Promise<number[]> => {
  try {
    const data = await asyncRetry<ChainsResponse>(
      async () => {
        const chainParams = new URLSearchParams()
        chainParams.set("chainTypes", config.lifiConfig.chainTypes.join(","))

        const response = await fetch(
          `${config.lifiConfig.apiUrl}/chains?${chainParams.toString()}`,
        )
        if (!response.ok) throw new Error("Failed to fetch chains")
        return response.json()
      },
      {
        retries: 3,
        minTimeout: 1000,
        factor: 2,
      },
    )
    return data?.chains.map(({ id }) => id) || []
  } catch (error) {
    console.error("Failed to fetch chains:", error)
    return []
  }
}

// Proxy state with chains promise
export const lifiChainsStore = proxy({ chainsIds: fetchChains() })
