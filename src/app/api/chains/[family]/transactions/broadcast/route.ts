// api/chains/[family]/transactions/broadcast
import type { NextRequest } from "next/server"

import { transactionResponseSchema } from "@/app/api/schemas/schemas"
import { getChainName } from "@/app/api/utils/tatumUtils"
import { throwIfQueryParamIsNull } from "@/app/api/utils/throwIfQueryParamIsNull"
import { isSupportedFamily } from "@/chain/provider/Bitcoin/types"
import { tatumConfig } from "@/configServerless"

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ family: string }>
  },
) {
  try {
    const { txData } = await request.json()
    const { family } = await params

    if (!isSupportedFamily(family)) {
      throw new Error("Family not supported")
    }

    throwIfQueryParamIsNull({ txData, family })

    const config = tatumConfig[family]
    if (!config.apiKey) {
      throw new Error(`API Key not found for ${family}`)
    }

    const chainName = getChainName(family)
    const body = JSON.stringify({ txData })
    const resp = await fetch(`https://api.tatum.io/v3/${chainName}/broadcast`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey,
      },
      body,
    })
    if (!resp.ok) {
      throw new Error(
        `Failed to broadcast transaction for ${family}: ${resp.status}-${resp.statusText}`,
      )
    }

    const parsedResp = transactionResponseSchema.safeParse(await resp.json())
    if (!parsedResp.success) {
      throw new Error(
        `Failed to parse broadcastTransaction on ${family} : ${parsedResp.error}}`,
      )
    }
    return Response.json(parsedResp.data)
  } catch (e: unknown) {
    console.log(e)
    return new Response("Internal server error", {
      status: 500,
      statusText: "Failed to process request",
    })
  }
}
