import type { BigNumberish } from "ethers/utils"
import { formatUnits, parseUnits } from "ethers/utils"

import { getG$Decimals, getGoodServerUrl } from "./config"

export const formatG$ = (amount: BigNumberish, chainId?: number): string =>
  formatUnits(amount, chainId ? getG$Decimals(chainId) : 2)

export const parseG$ = (value: string, chainId: number): BigNumberish =>
  parseUnits(value, getG$Decimals(chainId))

type FetchFn = (input: string, init?: RequestInit) => ReturnType<typeof fetch>

const acceptsJson = { Accept: "application/json" }

const responseToJson = async (response: Response) => {
  const { status } = response
  const [json, error] = await response
    .json()
    .then((json) => [json])
    .catch((error) => [{}, error])

  if (status >= 400) {
    const { error, message, errorMessage } = json

    throw new Error(
      error ??
        message ??
        errorMessage ??
        `Failed to fetch: status code '${status}'`,
    )
  }

  if (error) {
    throw error
  }

  return json
}

const createFetchWithBackend = (backend: string) => {
  return (input: string, init?: RequestInit) => {
    return fetch(backend + input, init)
  }
}

export const g$Api = () => withBackend(getGoodServerUrl())

const withBackend = createFetchWithBackend

export const fetchJson = async (url: string, fetchFn: FetchFn = fetch) =>
  fetchFn(url, { headers: acceptsJson }).then(responseToJson)

export const postJson = async (
  url: string,
  data: object,
  fetchFn: FetchFn = fetch,
) =>
  fetchFn(url, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      ...acceptsJson,
      "Content-type": "application/json",
    },
  }).then(responseToJson)
