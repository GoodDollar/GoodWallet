"use client"

import { createContext, type ReactNode, useCallback, useContext } from "react"
import type { SecureClient } from "@polymarket/client"

import useGeoblock, { type GeoblockStatus } from "../hooks/useGeoblock"
import useTradingSession from "../hooks/useTradingSession"
import type { TradingSession } from "../utils/session"
import { useWallet } from "./WalletContext"

interface TradingContextType {
  tradingSession: TradingSession | null
  isTradingSessionComplete: boolean
  client: SecureClient | null
  eoaAddress: string | undefined
  // Account wallet orders are funded from - a legacy Safe or a Deposit Wallet.
  walletAddress: string | undefined
  isGeoblocked: boolean
  geoblockStatus: GeoblockStatus | null
  // Welcome flow handlers
  welcomeLoading: boolean
  handleConnectStep: () => Promise<void> // authenticate + resolve account wallet
  handleApprovalsStep: () => Promise<void> // approve pUSD and outcome tokens
}

const TradingContext = createContext<TradingContextType | null>(null)

export function useTrading() {
  const ctx = useContext(TradingContext)
  if (!ctx) throw new Error("useTrading must be used within TradingProvider")
  return ctx
}

export default function TradingProvider({ children }: { children: ReactNode }) {
  const { eoaAddress } = useWallet()
  const { isBlocked: isGeoblocked, geoblockStatus } = useGeoblock()

  const {
    client,
    tradingSession,
    isTradingSessionComplete,
    welcomeLoading,
    handleConnectStep: connectStep,
    handleApprovalsStep,
  } = useTradingSession()

  const handleConnectStep = useCallback(async () => {
    if (isGeoblocked) {
      throw new Error(
        "Trading is not available in your region. Polymarket is geoblocked in your location.",
      )
    }
    return connectStep()
  }, [isGeoblocked, connectStep])

  return (
    <TradingContext.Provider
      value={{
        tradingSession,
        isTradingSessionComplete,
        client,
        eoaAddress,
        walletAddress: tradingSession?.wallet,
        isGeoblocked,
        geoblockStatus,
        welcomeLoading,
        handleConnectStep,
        handleApprovalsStep,
      }}
    >
      {children}
    </TradingContext.Provider>
  )
}
