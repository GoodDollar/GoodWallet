"use client"

import { createContext, useContext } from "react"
import type { PublicClient, WalletClient } from "viem"

export interface WalletContextType {
  eoaAddress: `0x${string}` | undefined
  publicClient: PublicClient | null
  walletClient: WalletClient | null
  isReady: boolean
  authenticated: boolean
}

export const WalletContext = createContext<WalletContextType>({
  eoaAddress: undefined,
  publicClient: null,
  walletClient: null,
  isReady: false,
  authenticated: false,
})

export function useWallet() {
  return useContext(WalletContext)
}
