"use client"

import { createContext, type ReactNode, useCallback, useContext } from "react"
import type { RelayClient } from "@polymarket/builder-relayer-client"
import type { ClobClient } from "@polymarket/clob-client"

import useClobClient from "../hooks/useClobClient"
import useGeoblock, { type GeoblockStatus } from "../hooks/useGeoblock"
import useSafeDeployment from "../hooks/useSafeDeployment"
import useTradingSession from "../hooks/useTradingSession"
import type { SessionStep, TradingSession } from "../utils/session"
import { useWallet } from "./WalletContext"

interface TradingContextType {
  tradingSession: TradingSession | null
  currentStep: SessionStep
  sessionError: Error | null
  isTradingSessionComplete: boolean
  initializeTradingSession: () => Promise<void>
  endTradingSession: () => void
  clobClient: ClobClient | null
  relayClient: RelayClient | null
  eoaAddress: string | undefined
  safeAddress: string | undefined
  shouldDeriveApiCredentials: boolean
  isGeoblocked: boolean
  isGeoblockLoading: boolean
  geoblockStatus: GeoblockStatus | null
  // Welcome flow handlers
  welcomeLoading: boolean
  handleFirstWelcomeStep: () => Promise<void> // try to create
  handleSecondWelcomeStep: () => Promise<void> // derive if necessary
  handleThirdWelcomeStep: () => Promise<void> // deploy safe
  handleFourthWelcomeStep: () => Promise<void> // allow tokens
  setCurrentStep: (step: SessionStep) => void
}

const TradingContext = createContext<TradingContextType | null>(null)

export function useTrading() {
  const ctx = useContext(TradingContext)
  if (!ctx) throw new Error("useTrading must be used within TradingProvider")
  return ctx
}

export default function TradingProvider({ children }: { children: ReactNode }) {
  const { eoaAddress } = useWallet()
  const { derivedSafeAddressFromEoa } = useSafeDeployment(eoaAddress)
  const {
    isBlocked: isGeoblocked,
    isLoading: isGeoblockLoading,
    geoblockStatus,
  } = useGeoblock()

  const {
    tradingSession,
    currentStep,
    sessionError,
    isTradingSessionComplete,
    initializeTradingSession: initSession,
    endTradingSession,
    relayClient,
    welcomeLoading,
    shouldDeriveApiCredentials,
    handleFirstWelcomeStep,
    handleSecondWelcomeStep,
    handleThirdWelcomeStep,
    handleFourthWelcomeStep,
    setCurrentStep,
  } = useTradingSession()

  const { clobClient } = useClobClient(tradingSession, isTradingSessionComplete)

  const initializeTradingSession = useCallback(async () => {
    if (isGeoblocked) {
      throw new Error(
        "Trading is not available in your region. Polymarket is geoblocked in your location.",
      )
    }
    return initSession()
  }, [isGeoblocked, initSession])

  return (
    <TradingContext.Provider
      value={{
        tradingSession,
        currentStep,
        sessionError,
        isTradingSessionComplete,
        initializeTradingSession,
        endTradingSession,
        clobClient,
        relayClient,
        eoaAddress,
        safeAddress: derivedSafeAddressFromEoa,
        isGeoblocked,
        shouldDeriveApiCredentials,
        isGeoblockLoading,
        geoblockStatus,
        welcomeLoading,
        handleFirstWelcomeStep,
        handleSecondWelcomeStep,
        handleThirdWelcomeStep,
        handleFourthWelcomeStep,
        setCurrentStep,
      }}
    >
      {children}
    </TradingContext.Provider>
  )
}
