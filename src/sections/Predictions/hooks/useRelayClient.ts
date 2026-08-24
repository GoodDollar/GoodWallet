// biome-ignore-all lint/suspicious/noExplicitAny: need to cast the window
import { useCallback, useState } from "react"
import { RelayClient } from "@polymarket/builder-relayer-client"

import { BUILDER_PROXY_URL, POLYGON_CHAIN_ID } from "../constants/polymarket"
import { useWallet } from "../providers/WalletContext"

// This hook is responsible for creating and managing the relay client instance
// The user's signer and builder config are used to initialize the relay client
export default function useRelayClient() {
  const [relayClient, setRelayClient] = useState<RelayClient | null>(null)
  const { eoaAddress, walletClient } = useWallet()

  // This function initializes the relay client with
  // the user's signer and builder config
  const initializeRelayClient = useCallback(async () => {
    if (!eoaAddress || !walletClient) {
      return null
    }

    // The relayClient instance is used for deploying the Safe,
    // setting token approvals, and executing CTF operations such
    // as splitting, merging, and redeeming positions. It talks to the relayer
    // through our own proxy, which holds the builder credentials obtained from
    // 'polymarket.com/settings?tab=builder' and signs relay requests with them.
    const client = new RelayClient(
      BUILDER_PROXY_URL("relayer"),
      POLYGON_CHAIN_ID,
      walletClient as any,
    )

    setRelayClient(client)
    return client
  }, [eoaAddress, walletClient])

  // This function clears the relay client and resets the state
  const clearRelayClient = useCallback(() => {
    setRelayClient(null)
  }, [])

  return {
    relayClient,
    initializeRelayClient,
    clearRelayClient,
  }
}
