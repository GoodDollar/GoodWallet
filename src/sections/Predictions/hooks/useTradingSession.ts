import { useCallback, useEffect, useState } from "react"
import {
  createSecureClient,
  remoteBuilderSigning,
  type SecureClient,
  WalletType,
} from "@polymarket/client"
import { signerFrom } from "@polymarket/client/viem"

import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"

import { BUILDER_SIGNING_URL } from "../constants/polymarket"
import { useWallet } from "../providers/WalletContext"
import { loadSession, saveSession, type TradingSession } from "../utils/session"
import { deriveSafeAddress } from "../utils/wallet"

// The whole Polymarket session: one SecureClient, plus the two things the welcome
// flow walks the user through - connecting and setting the trading approvals.
// createSecureClient covers what used to be three separate steps: it derives or
// creates the CLOB credentials, resolves the account wallet and deploys it when
// it does not exist yet.

export default function useTradingSession() {
  const [client, setClient] = useState<SecureClient | null>(null)
  const [tradingSession, setTradingSession] = useState<TradingSession | null>(
    null,
  )
  const [welcomeLoading, setWelcomeLoading] = useState(false)

  const { eoaAddress, walletClient, publicClient } = useWallet()
  const { captureEvent } = useAnalytics()

  const connect = useCallback(async () => {
    if (!eoaAddress || !walletClient || !publicClient) return

    // Users who deployed a Safe under the old SDK keep trading from it - it holds
    // their funds and positions. The new relayer cannot deploy a Safe, so
    // everyone else gets a Deposit Wallet, which the SDK derives and deploys
    // itself when `wallet` is omitted.
    const safeAddress = deriveSafeAddress(eoaAddress)
    const safeCode = await publicClient.getCode({ address: safeAddress })
    const stored = loadSession(eoaAddress)

    try {
      const secureClient = await createSecureClient({
        ...(safeCode && safeCode !== "0x" ? { wallet: safeAddress } : {}),
        signer: signerFrom(walletClient),
        apiKey: remoteBuilderSigning({ url: BUILDER_SIGNING_URL }),
        credentials: stored?.credentials,
      })

      captureEvent({
        type: AnalyticsEventTypes.PolymarketAuthenticationSucceeded,
        walletType: WalletType[secureClient.account.walletType],
      })

      const session: TradingSession = {
        eoaAddress,
        wallet: secureClient.account.wallet,
        // Approvals are not readable back from the client, so we trust what we
        // recorded last time. If they turn out to be missing, order placement
        // recovers on its own by approving and retrying.
        hasApprovals: stored?.hasApprovals ?? false,
        credentials: secureClient.credentials,
      }

      setClient(secureClient)
      setTradingSession(session)
      saveSession(eoaAddress, session)
    } catch (err) {
      captureEvent({
        type: AnalyticsEventTypes.PolymarketAuthenticationFailed,
        errorReason: err instanceof Error ? err.message : "Unknown error",
      })
      throw err
    }
  }, [eoaAddress, walletClient, publicClient, captureEvent])

  // Returning users reconnect silently - the stored credentials let
  // createSecureClient skip the signature prompt. Anyone without a stored
  // session waits for the welcome flow, so opening the tab never prompts the
  // wallet on its own.
  useEffect(() => {
    if (!eoaAddress || !walletClient) {
      setClient(null)
      setTradingSession(null)
      return
    }
    if (!loadSession(eoaAddress)) return

    connect().catch((err) => {
      console.error("Failed to restore trading session:", err)
    })
  }, [eoaAddress, walletClient])

  // Step 1: authenticate and resolve (deploying if needed) the account wallet.
  const handleConnectStep = useCallback(async () => {
    setWelcomeLoading(true)
    try {
      await connect()
    } finally {
      setWelcomeLoading(false)
    }
  }, [connect])

  // Step 2: approve pUSD and the conditional tokens for the exchange contracts.
  // setupTradingApprovals submits only what is missing, so it is safe to repeat.
  const handleApprovalsStep = useCallback(async () => {
    if (!client || !tradingSession || !eoaAddress) return

    setWelcomeLoading(true)
    try {
      await client.setupTradingApprovals()
      captureEvent({ type: AnalyticsEventTypes.PolymarketAllowTokensSucceeded })

      const session = { ...tradingSession, hasApprovals: true }
      setTradingSession(session)
      saveSession(eoaAddress, session)
    } catch (error) {
      captureEvent({
        type: AnalyticsEventTypes.PolymarketAllowTokensFailed,
        errorReason: error instanceof Error ? error.message : "Unknown error",
      })
      throw error
    } finally {
      setWelcomeLoading(false)
    }
  }, [client, tradingSession, eoaAddress, captureEvent])

  return {
    client,
    tradingSession,
    isTradingSessionComplete: !!client && !!tradingSession?.hasApprovals,
    welcomeLoading,
    handleConnectStep,
    handleApprovalsStep,
  }
}
