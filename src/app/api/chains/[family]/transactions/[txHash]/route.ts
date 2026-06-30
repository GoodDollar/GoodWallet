// /api/chains/{family}/transactions/[txHash]
import { type NextRequest, NextResponse } from "next/server"
import z from "zod"

import { throwIfQueryParamIsNull } from "@/app/api/utils/throwIfQueryParamIsNull"
import {
  isSupportedFamily,
  type SUPPORTED_UTXO_FAMILIES,
} from "@/chain/provider/Bitcoin/types"
import { tatumConfig } from "@/configServerless"

const getrawtransactionSchema = z.union([
  z.string(),
  z.object({
    confirmations: z.number().default(0),
  }),
])

const RpcErrorSchema = z.object({
  code: z.number().optional(),
  message: z.string(),
})

const RpcResponseSchema = z.union([
  z.object({
    result: getrawtransactionSchema,
    error: z.null().optional(),
  }),
  z.object({
    result: z.null().optional(),
    error: RpcErrorSchema,
  }),
])

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ family: string; txHash: string }>
  },
) {
  try {
    const { family, txHash } = await params
    const searchParams = request.nextUrl.searchParams
    const verboseParam = searchParams.get("verbose")
    const isVerbose = verboseParam
      ? verboseParam.toLowerCase() === "true"
      : false

    if (!isSupportedFamily(family)) {
      throw new Error("Family is not supported")
    }

    throwIfQueryParamIsNull({ txHash, family })

    const transaction = await getTransaction(txHash, isVerbose, family)
    return NextResponse.json(transaction, { status: 200 })
  } catch (e: unknown) {
    console.error(e)
    return NextResponse.json(
      { message: "Failed to process request" },
      { status: 500 },
    )
  }
}

// on the usage of verbosity: https://developer.bitcoin.org/reference/rpc/getrawtransaction.html
const getTransaction = async (
  txHash: string,
  isVerbose: boolean,
  family: SUPPORTED_UTXO_FAMILIES,
) => {
  const config = tatumConfig[family]
  if (!config.apiKey) {
    throw new Error(`No tatum api key found for family: ${family}`)
  }

  const resp = await fetch(config.rpcUrl, {
    headers: {
      "x-api-key": config.apiKey,
      "content-type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getrawtransaction",
      params: [txHash, isVerbose],
    }),
  })
  if (!resp.ok) {
    throw new Error(
      `Failed to call RPC for ${family}: ${resp.status}-${resp.statusText}`,
    )
  }

  const rawJson = await resp.json()
  const parseResult = RpcResponseSchema.safeParse(rawJson)
  if (!parseResult.success) {
    throw new Error(`Invalid RPC Response Format: ${parseResult.error.message}`)
  }

  const data = parseResult.data
  if (data.error) {
    throw new Error(`RPC Node Error: ${data.error.message}`)
  }

  return data.result
}
