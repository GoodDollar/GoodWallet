"use client"

import { createContext, useContext } from "react"
import type { JsonRpcSigner } from "ethers"
import type { PublicClient, WalletClient } from "viem"

export interface WalletContextType {
  eoaAddress: `0x${string}` | undefined
  publicClient: PublicClient | null
  walletClient: WalletClient | null
  ethersSigner: JsonRpcSigner | null
  isReady: boolean
  authenticated: boolean
}

export const WalletContext = createContext<WalletContextType>({
  eoaAddress: undefined,
  publicClient: null,
  walletClient: null,
  ethersSigner: null,
  isReady: false,
  authenticated: false,
})

export function useWallet() {
  return useContext(WalletContext)
}
