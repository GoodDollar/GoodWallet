import { useCallback, useEffect, useState } from "react"

import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"

import { useWallet } from "../providers/WalletContext"
import {
  clearSession as clearStoredSession,
  loadSession,
  type SessionStep,
  saveSession,
  type TradingSession,
} from "../utils/session"
import useRelayClient from "./useRelayClient"
import useSafeDeployment from "./useSafeDeployment"
import useTokenApprovals from "./useTokenApprovals"
import useUserApiCredentials from "./useUserApiCredentials"

// This is the coordination hook that manages the user's trading session
// It orchestrates the steps for initializing both the clob and relay clients
// It creates, stores, and loads the user's L2 credentials for the trading session (API credentials)
// It deploys the Safe and sets token approvals for the CTF Exchange

export default function useTradingSession() {
  const [currentStep, setCurrentStep] = useState<SessionStep>("idle")
  const [sessionError, setSessionError] = useState<Error | null>(null)
  const [tradingSession, setTradingSession] = useState<TradingSession | null>(
    null,
  )
  const [welcomeLoading, setWelcomeLoading] = useState(false)
  const [shouldDeriveApiCredentials, setShouldDeriveApiCredentials] =
    useState(false)

  const { eoaAddress } = useWallet()
  const { deriveUserApiCredentials, createUserApiCredentials } =
    useUserApiCredentials()
  const { checkAllTokenApprovals, setAllTokenApprovals } = useTokenApprovals()
  const { derivedSafeAddressFromEoa, isSafeDeployed, deploySafe } =
    useSafeDeployment(eoaAddress)
  const { relayClient, initializeRelayClient, clearRelayClient } =
    useRelayClient()
  const { captureEvent } = useAnalytics()

  // Always check for an existing trading session after wallet is connected by checking
  // session object from localStorage to track the status of the user's trading session
  useEffect(() => {
    ;(async () => {
      if (!eoaAddress) {
        setTradingSession(null)
        setCurrentStep("idle")
        setSessionError(null)
        return
      }

      const stored = loadSession(eoaAddress)
      if (!stored) {
        setCurrentStep("idle")
        setSessionError(null)
        return
      }

      // Restore session from localStorage and refresh status checks
      await initializeTradingSession()
    })()
  }, [eoaAddress])

  // Restores the relay client when session exists
  useEffect(() => {
    if (tradingSession && !relayClient && eoaAddress) {
      initializeRelayClient().catch((err) => {
        console.error("Failed to restore relay client:", err)
      })
    }
  }, [tradingSession, relayClient, eoaAddress, initializeRelayClient])

  // The core function that orchestrates the trading session initialization
  // Always reads from localStorage directly to avoid React state race conditions
  const initializeTradingSession = useCallback(async () => {
    if (!eoaAddress) throw new Error("Wallet address not connected")
    setCurrentStep("checking")
    setSessionError(null)

    try {
      // Always load stored session directly from localStorage to get existing credentials
      const storedSession = loadSession(eoaAddress)

      // Step 1: Initializes relayClient with the ethers signer and
      // Builder's credentials (via remote signing server) for authentication
      const relayClient = await initializeRelayClient()

      // Step 2: Get Safe address (deterministic derivation from EOA)
      if (!derivedSafeAddressFromEoa) {
        return
      }

      if (!relayClient) {
        return
      }

      // Step 3: Check if Safe is deployed
      const isDeployed = await isSafeDeployed(
        relayClient,
        derivedSafeAddressFromEoa,
      )

      // Step 5: Get User API Credentials (derive or create)
      // and store them in the trading session object
      // Read existing credentials from localStorage (storedSession)
      const existingCreds = storedSession?.apiCredentials
      const hasApiCredentials = !!(
        existingCreds?.key &&
        existingCreds?.secret &&
        existingCreds?.passphrase
      )

      const approvalStatus = await checkAllTokenApprovals(
        derivedSafeAddressFromEoa,
      )

      let hasApprovals = false
      if (approvalStatus.allApproved) {
        hasApprovals = true
      }

      // Step 7: Create custom session object
      // Preserve existing apiCredentials from stored session if they exist
      const newSession: TradingSession = {
        eoaAddress: eoaAddress,
        safeAddress: derivedSafeAddressFromEoa,
        isSafeDeployed: isDeployed,
        hasApiCredentials,
        hasApprovals,
        lastChecked: Date.now(),
        ...(hasApiCredentials && existingCreds
          ? { apiCredentials: existingCreds }
          : {}),
      }

      setTradingSession(newSession)
      saveSession(eoaAddress, newSession)
    } catch (err) {
      console.error("Session initialization error:", err)
      const error = err instanceof Error ? err : new Error("Unknown error")
      setSessionError(error)
      setCurrentStep("idle")
    }
  }, [
    eoaAddress,
    relayClient,
    derivedSafeAddressFromEoa,
    isSafeDeployed,
    createUserApiCredentials,
    deriveUserApiCredentials,
  ])

  // This function clears the trading session and resets the state
  const endTradingSession = useCallback(() => {
    if (!eoaAddress) return

    clearStoredSession(eoaAddress)
    setTradingSession(null)
    clearRelayClient()
    setCurrentStep("idle")
    setSessionError(null)
  }, [eoaAddress, clearRelayClient])

  const handleFirstWelcomeStep = useCallback(async () => {
    try {
      // try to create
      if (!eoaAddress) return
      if (!tradingSession) return
      setWelcomeLoading(true)
      setCurrentStep("authenticating_create")
      const apiCreds = await createUserApiCredentials()

      const updatedSession = {
        ...tradingSession,
        apiCredentials: apiCreds,
        hasApiCredentials: true,
        lastChecked: Date.now(),
      }
      setTradingSession(updatedSession)
      saveSession(eoaAddress, updatedSession)
      setWelcomeLoading(false)
    } catch (error) {
      captureEvent({
        type: AnalyticsEventTypes.PolymarketAuthenticationFailed,
        errorReason: error instanceof Error ? error.message : "Unknown error",
      })
      setWelcomeLoading(false)
      setShouldDeriveApiCredentials(true)
    }
  }, [eoaAddress, tradingSession, createUserApiCredentials])

  const handleSecondWelcomeStep = useCallback(async () => {
    try {
      // auth
      if (!eoaAddress) return
      if (!tradingSession) return
      if (!shouldDeriveApiCredentials) return

      setWelcomeLoading(true)
      setCurrentStep("authenticating_derive")
      const apiCreds = await deriveUserApiCredentials()
      const updatedSession = {
        ...tradingSession,
        apiCredentials: apiCreds,
        hasApiCredentials: true,
        lastChecked: Date.now(),
      }
      setTradingSession(updatedSession)
      saveSession(eoaAddress, updatedSession)
      setWelcomeLoading(false)
    } catch (error) {
      captureEvent({
        type: AnalyticsEventTypes.PolymarketAuthenticationFailed,
        errorReason: error instanceof Error ? error.message : "Unknown error",
      })
      setWelcomeLoading(false)
      throw error
    }
  }, [
    eoaAddress,
    tradingSession,
    deriveUserApiCredentials,
    shouldDeriveApiCredentials,
  ])

  const handleThirdWelcomeStep = useCallback(async () => {
    try {
      // deploy safe
      if (!eoaAddress) return
      if (!tradingSession) return
      if (!relayClient) return
      setWelcomeLoading(true)
      setCurrentStep("deploying")
      await deploySafe(relayClient)
      const updatedSession = {
        ...tradingSession,
        isSafeDeployed: true,
        lastChecked: Date.now(),
      }
      setTradingSession(updatedSession)
      saveSession(eoaAddress, updatedSession)
      setWelcomeLoading(false)
    } catch (error) {
      setWelcomeLoading(false)
      throw error
    }
  }, [eoaAddress, tradingSession, relayClient, deploySafe])

  const handleFourthWelcomeStep = useCallback(async () => {
    try {
      //allow tokens
      if (!eoaAddress) return
      if (!tradingSession) return
      if (!relayClient) return
      if (!derivedSafeAddressFromEoa) return

      setWelcomeLoading(true)
      setCurrentStep("approvals")
      await setAllTokenApprovals(relayClient)

      const updatedSession = {
        ...tradingSession,
        hasApprovals: true,
        lastChecked: Date.now(),
      }
      setTradingSession(updatedSession)
      saveSession(eoaAddress, updatedSession)
      setWelcomeLoading(false)
      setCurrentStep("complete")
    } catch (error) {
      setWelcomeLoading(false)
      throw error
    }
  }, [
    eoaAddress,
    tradingSession,
    relayClient,
    checkAllTokenApprovals,
    derivedSafeAddressFromEoa,
  ])

  return {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete:
      (tradingSession?.isSafeDeployed &&
        tradingSession?.hasApiCredentials &&
        tradingSession?.hasApprovals) ||
      false,
    initializeTradingSession,
    endTradingSession,
    relayClient,
    setCurrentStep,
    welcomeLoading,
    shouldDeriveApiCredentials,
    handleFirstWelcomeStep,
    handleSecondWelcomeStep,
    handleThirdWelcomeStep,
    handleFourthWelcomeStep,
  }
}
