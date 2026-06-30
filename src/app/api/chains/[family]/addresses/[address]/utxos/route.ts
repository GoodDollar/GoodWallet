// /api/chains/{family}/addresses/[address]/utxos
import type { NextRequest } from "next/server"

import { unspentUTXOsSchema } from "@/app/api/schemas/schemas"
import { throwIfQueryParamIsNull } from "@/app/api/utils/throwIfQueryParamIsNull"
import { isSupportedFamily } from "@/chain/provider/Bitcoin/types"
import { tatumConfig } from "@/configServerless"

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ family: string; address: string }>
  },
) {
  try {
    const { family, address } = await params
    const searchParams = request.nextUrl.searchParams
    const totalValueBtc = searchParams.get("totalValueBtc")

    if (!isSupportedFamily(family)) {
      throw new Error("Family not supported")
    }

    throwIfQueryParamIsNull({ family, address, totalValueBtc })

    if (Number(totalValueBtc as string) <= 0) {
      return Response.json([])
    }

    const config = tatumConfig[family]
    if (!config.apiKey) {
      throw new Error(`API Key not found for ${family}`)
    }

    const resp = await fetch(
      `https://api.tatum.io/v4/data/utxos?chain=${config.endpoint}&address=${address}&totalValue=${totalValueBtc}`,
      {
        headers: {
          "x-api-key": config.apiKey,
        },
      },
    )
    if (!resp.ok) {
      throw new Error(
        `Failed to get unspent UTXOs for ${address} on ${family}: ${resp.status}-${resp.statusText}`,
      )
    }
    const parsedResp = unspentUTXOsSchema.safeParse(await resp.json())
    if (!parsedResp.success) {
      throw new Error(
        `Failed to parse unspent UTXOs for ${address} on ${family} : ${parsedResp.error}}`,
      )
    }
    return Response.json(parsedResp.data)
  } catch (e: unknown) {
    console.error(e)
    return Response.json({ message: "Failed to process request", error: e })
  }
}
