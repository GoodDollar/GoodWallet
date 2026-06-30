import retry from "async-retry"

import { NormalizedAddressMap } from "@/hooks/useTokenBalances/NormalizedAddressMap"

type TokenBalance = {
  contractAddress: string
  tokenBalance: string
  error?: unknown
}

// TODO: Create zod schema parsing,
//       as errors can arrise response without being http errors.
//       See API reference
async function getTokenBalancesInternal(
  rpcUrl: string,
  address: string,
): Promise<TokenBalance[]> {
  const optionsWithoutSignal = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "alchemy_getTokenBalances",
      params: [address],
    }),
  }

  // Create a function to fetch with retries
  const resp = await retry(
    async (bail) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(`Request takes too long for chain ID ${rpcUrl}`),
        8000,
      )
      try {
        const response = await fetch(rpcUrl, {
          ...optionsWithoutSignal,
          signal: controller.signal,
        })
        if (response.status > 500) {
          throw new Error("Server error. Retrying...")
        }
        if (response.status === 429) {
          throw new Error("Rate Limit. Retrying...")
        }
        return response
      } catch (error) {
        clearTimeout(timeoutId)
        // If it's an AbortError, we should not retry
        if (error instanceof Error && error.name === "AbortError") {
          console.error(
            `Error getting alchemy balance for chainId ${rpcUrl.split("/").pop()}`,
            error.message,
          )
          // Use bail to stop retrying on AbortError
          bail(error)
          return null
        }
        throw error
      } finally {
        clearTimeout(timeoutId)
      }
    },
    {
      retries: 3, // Number of retries before giving up
      factor: 2, // Exponential factor
      minTimeout: 500, // Minimum wait time before retrying
      maxTimeout: 4000, // Maximum wait time before retrying
      randomize: true, // Randomize the wait time
    },
  )

  // Return empty array if response is null (happens when aborted)
  if (!resp) {
    return []
  }

  if (!resp.ok) {
    throw Error(`alchemy request http error code: ${resp.status}`)
  }

  try {
    const {
      result: { tokenBalances },
    } = await resp.json()

    return tokenBalances as TokenBalance[]
  } catch (error) {
    console.error(`Error parsing JSON from Alchemy response`, error)
    return []
  }
}

type Address = string
export async function getTokenBalances(
  rpcUrl: string,
  address: string,
): Promise<Map<Address, string>> {
  const balances = new NormalizedAddressMap<Address, string>("EVM")

  for (const balance of await getTokenBalancesInternal(rpcUrl, address)) {
    if (balance.error) {
      console.warn(
        `Error getting token balance for address ${balance.contractAddress}: ${balance.error}`,
      )
      continue
    }
    if (BigInt(balance.tokenBalance) > 0) {
      balances.set(balance.contractAddress, balance.tokenBalance)
    }
  }

  return balances
}
