import { transactionsSchema } from "@/app/api/schemas/schemas"
import { getChainName } from "@/app/api/utils/tatumUtils"
import type { SUPPORTED_UTXO_FAMILIES } from "@/chain/provider/Bitcoin/types"
import { tatumConfig } from "@/configServerless"

export const getUTXOHistory = async (
  address: string,
  family: SUPPORTED_UTXO_FAMILIES,
) => {
  const config = tatumConfig[family]
  if (!config.apiKey) throw new Error(`API Key not found for ${family}`)
  const chainName = getChainName(family)

  const resp = await fetch(
    `https://api.tatum.io/v3/${chainName}/transaction/address/${address}?pageSize=50`,
    {
      headers: {
        "x-api-key": config.apiKey,
      },
    },
  )
  if (!resp.ok) {
    throw new Error(
      `Failed to get transactions for ${address} on ${family}: ${resp.status}-${resp.statusText}`,
    )
  }
  const parsedResp = transactionsSchema.safeParse(await resp.json())
  if (!parsedResp.success) {
    throw new Error(
      `Failed to parse transactions for ${address} on ${family} : ${parsedResp.error}}`,
    )
  }
  return parsedResp.data
}
