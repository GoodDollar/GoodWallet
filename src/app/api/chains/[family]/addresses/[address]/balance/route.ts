// /api/chains/{family}/addresses/{address}/balance
import type { NextRequest } from "next/server"

import { isSupportedFamily } from "@/chain/provider/Bitcoin/types"
import { tatumConfig } from "@/configServerless"

import { BalanceSchema } from "../../../../../schemas/schemas"
import { getChainName } from "../../../../../utils/tatumUtils"
import { throwIfQueryParamIsNull } from "../../../../../utils/throwIfQueryParamIsNull"

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ family: string; address: string }>
  },
) {
  try {
    const { family, address } = await context.params

    if (!isSupportedFamily(family)) {
      throw new Error("Family not supported")
    }

    throwIfQueryParamIsNull({ address, family })

    const config = tatumConfig[family]
    if (!config.apiKey) throw new Error(`API Key not found for ${family}`)
    const chainName = getChainName(family)

    const resp = await fetch(
      `https://api.tatum.io/v3/${chainName}/address/balance/${address}`,
      {
        headers: {
          "x-api-key": config.apiKey,
        },
      },
    )
    if (!resp.ok) {
      throw new Error(
        `Failed to get balance for ${address} on ${family}: ${resp.status}-${resp.statusText}`,
      )
    }

    const parsedResp = BalanceSchema.safeParse(await resp.json())
    if (!parsedResp.success) {
      throw new Error(
        `Failed to parse balance for ${address} on ${family} : ${parsedResp.error}`,
      )
    }
    return Response.json(parsedResp.data)
  } catch (e: unknown) {
    console.error(e)
    return Response.json({ message: "Failed to process request", error: e })
  }
}
