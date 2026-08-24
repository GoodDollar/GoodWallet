// biome-ignore-all lint/suspicious/noExplicitAny: need to cast the window
import { useMemo } from "react"
import { ClobClient } from "@polymarket/clob-client"

import { BUILDER_PROXY_URL, POLYGON_CHAIN_ID } from "../constants/polymarket"
import useSafeDeployment from "../hooks/useSafeDeployment"
import { useWallet } from "../providers/WalletContext"
import type { TradingSession } from "../utils/session"

// This hook creates the authenticated clobClient with the User API Credentials
// and the builder config credentials, but only after a trading session is initialized

export default function useClobClient(
  tradingSession: TradingSession | null,
  isTradingSessionComplete: boolean | undefined,
) {
  const { eoaAddress, ethersSigner } = useWallet()
  const { derivedSafeAddressFromEoa } = useSafeDeployment(eoaAddress)

  const clobClient = useMemo(() => {
    if (
      !ethersSigner ||
      !eoaAddress ||
      !derivedSafeAddressFromEoa ||
      !isTradingSessionComplete ||
      !tradingSession?.apiCredentials
    ) {
      return null
    }

    // This is the persisted clobClient instance for creating and posting
    // orders for the user. It goes through our own proxy, which adds the
    // builder credentials for order attribution server-side.
    return new ClobClient(
      BUILDER_PROXY_URL("clob"),
      POLYGON_CHAIN_ID,
      ethersSigner as any,
      tradingSession.apiCredentials,
      2, // signatureType = 2 for embedded wallet EOA to sign for Safe proxy wallet
      derivedSafeAddressFromEoa,
      undefined, // mandatory placeholder
      false,
    )
  }, [
    eoaAddress,
    ethersSigner,
    derivedSafeAddressFromEoa,
    isTradingSessionComplete,
    tradingSession?.apiCredentials,
  ])

  return { clobClient }
}
