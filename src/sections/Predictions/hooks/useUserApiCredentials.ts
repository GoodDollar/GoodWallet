// biome-ignore-all lint/suspicious/noExplicitAny: need to cast the window
import { useCallback } from "react"
import { ClobClient } from "@polymarket/clob-client"

import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"

import { CLOB_API_URL, POLYGON_CHAIN_ID } from "../constants/polymarket"
import { useWallet } from "../providers/WalletContext"

export interface UserApiCredentials {
  key: string
  secret: string
  passphrase: string
}

// This hook's sole purpose is to derive or create
// the User API Credentials with a temporary ClobClient

export default function useUserApiCredentials() {
  const { eoaAddress, ethersSigner } = useWallet()
  const { captureEvent } = useAnalytics()

  const createUserApiCredentials = useCallback(async () => {
    if (!eoaAddress || !ethersSigner) throw new Error("Wallet not connected")
    const tempClient = new ClobClient(
      CLOB_API_URL,
      POLYGON_CHAIN_ID,
      ethersSigner as any,
    )
    const creds = await tempClient.createApiKey()
    if (!creds.key || !creds.secret || !creds.passphrase) {
      throw new Error("Failed to get API credentials")
    }
    captureEvent({
      type: AnalyticsEventTypes.PolymarketAuthenticationSucceeded,
    })
    return creds
  }, [eoaAddress, ethersSigner])

  const deriveUserApiCredentials = useCallback(async () => {
    if (!eoaAddress || !ethersSigner) throw new Error("Wallet not connected")
    const tempClient = new ClobClient(
      CLOB_API_URL,
      POLYGON_CHAIN_ID,
      ethersSigner as any,
    )
    const creds = await tempClient.deriveApiKey()
    if (!creds.key || !creds.secret || !creds.passphrase) {
      throw new Error("Failed to get API credentials")
    }
    captureEvent({
      type: AnalyticsEventTypes.PolymarketAuthenticationSucceeded,
    })
    return creds
  }, [eoaAddress, ethersSigner])

  return {
    createUserApiCredentials,
    deriveUserApiCredentials,
  }
}
