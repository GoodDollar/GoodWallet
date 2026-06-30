import type { z } from "zod"

import {
  type FourByteResponse,
  fourBytesResponseSchema,
} from "@/schemas/api/ledger/TransactionsSchema"

const MethodRecord: Record<string, string> = {
  "0x": "Sent",
  "0x4e71d92d": "Claimed",
  "0x4000aea0": "TransferredAndCalled",
  "0xa9059cbb": "Transferred",
  "0x38ed1739": "SwappedExactTokensForTokens",
  "0x8803dbee": "SwappedTokensForExactTokens",
  "0x3771dcf8": "ToppedWallet",
  "0x095ea7b3": "Approved",
  "0x6a761202": "ExecutedTransaction",
}

export const fetchFunctionSignature = async (
  input: string,
  incoming: boolean,
  isFromUBI: boolean = false,
  isFromTopup: boolean = false,
): Promise<string> => {
  if (isFromTopup) {
    return "G$ Faucet"
  }

  const fourByte = input.slice(0, 10)

  if (fourByte.length === 0) {
    if (isFromUBI) {
      return "Claimed"
    }
    if (incoming) {
      return "Received"
    }
    return "Sent"
  }

  if (incoming && fourByte === "0x") {
    return "Received"
  }

  if (fourByte in MethodRecord) {
    return MethodRecord[fourByte]
  }

  try {
    const url = `https://api.etherface.io/v1/signatures/hash/function/${fourByte}/1`
    const response = await fetch(url, {
      signal: AbortSignal.timeout(500),
    })

    const data: FourByteResponse = await response.json()

    const parsedData = await fourBytesResponseSchema.parseAsync(data)

    if (parsedData.items.length === 0) {
      return ""
    }

    return parsedData.items[0].text
  } catch {
    return fourByte
  }
}

export async function fetchAndParse<T>(url: string, schema: z.ZodSchema<T>) {
  return fetch(url)
    .then((res) => res.json())
    .then((json) => schema.parseAsync(json.result))
    .catch((error) => {
      console.error(`Error fetching and parsing data from ${url}: ${error}`)
      return Promise.resolve([])
    })
}
