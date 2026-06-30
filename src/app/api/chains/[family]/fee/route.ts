// /api/chains/{family}/addresses/{address}/balance
import type { NextRequest } from "next/server"

import { networkFeeSchema } from "@/app/api/schemas/schemas"
import { getChainName } from "@/app/api/utils/tatumUtils"
import { throwIfQueryParamIsNull } from "@/app/api/utils/throwIfQueryParamIsNull"
import { isSupportedFamily } from "@/chain/provider/Bitcoin/types"
import { tatumConfig } from "@/configServerless"

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ family: string }>
  },
) {
  try {
    const { family } = await params
    throwIfQueryParamIsNull({ family })

    if (!isSupportedFamily(family)) {
      throw new Error("Family not supported")
    }

    const config = tatumConfig[family]
    if (!config.apiKey) {
      throw new Error(`API Key not found for ${family}`)
    }
    const symbol = getChainName(family) === "bitcoin" ? "BTC" : "DOGE"
    const resp = await fetch(
      `https://api.tatum.io/v3/blockchain/fee/${symbol}`,
      {
        headers: {
          "x-api-key": config.apiKey,
        },
      },
    )
    if (!resp.ok) {
      throw new Error(
        `Failed to get network fee on ${family}: ${resp.status}-${resp.statusText}`,
      )
    }
    const parsedResp = networkFeeSchema.safeParse(await resp.json())
    if (!parsedResp.success) {
      throw new Error(
        `Failed to parse networkFees on ${family} : ${parsedResp.error}}`,
      )
    }
    return Response.json(parsedResp.data)
  } catch (e: unknown) {
    console.error(e)
    return Response.json({ message: "Failed to process request", error: e })
  }
}
