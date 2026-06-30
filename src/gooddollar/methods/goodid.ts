import type { EVMSigner } from "@/login"

import { getGoodIDUrl } from "../config"
import { fetchJson, g$Api } from "../utils"

const FV_IDENTIFIER_MSG2 = (address: string) => {
  return `Sign this message to request verifying your account ${address} and to create your own secret unique identifier for your anonymized record.
You can use this identifier in the future to delete this anonymized record.
WARNING: do not sign this message unless you trust the website/application requesting this signature.`
}

const getDefaultRedirectUrl = (): string => {
  const url = new URL(window.location.href)

  url.search = ""
  return url.toString()
}

export const generateGoodIDLink = async (
  signer: EVMSigner,
  firstName: string,
  chainId?: number,
  redirectUrl?: string,
): Promise<string> => {
  const url = new URL(getGoodIDUrl())
  const address = signer.address
  const goodIdSig = await signer.signMessage(FV_IDENTIFIER_MSG2(address))

  const queryParams: URLSearchParams = new URLSearchParams()
  if (chainId) queryParams.set("chain", chainId.toString())

  queryParams.set("account", address)
  queryParams.set("fvsig", goodIdSig)
  queryParams.set("firstname", firstName)
  queryParams.set("rdu", redirectUrl ?? getDefaultRedirectUrl())
  queryParams.set("isDelta", "true")

  url.search = queryParams.toString()

  return url.toString()
}

export const parseGoodIDRedirectUrl = (
  chainId?: number,
  redirectUrl?: string,
): boolean => {
  const { searchParams } = new URL(redirectUrl ?? window.location.href)

  if (
    !searchParams.has("verified") ||
    (chainId && String(chainId) !== searchParams.get("chain"))
  ) {
    return false
  }

  if (searchParams.get("verified") !== String(true)) {
    throw new Error(
      searchParams.get("reason") ??
        "Failed to verify due to the unknown / unexpected error",
    )
  }

  return true
}

export const syncWhitelist = async (address: string) => {
  try {
    const res = await fetchJson(`/syncWhitelist/${address}`, g$Api())
    return res?.whitelisted
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.log(`Failed to sync whitelist for ${address}: ${e.message}`)
    }

    return false
  }
}
