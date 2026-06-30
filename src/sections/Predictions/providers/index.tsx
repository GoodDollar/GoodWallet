"use client"

import type { ReactNode } from "react"

import TradingProvider from "./TradingProvider"
import WalletProvider from "./WalletProvider"

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <TradingProvider>{children}</TradingProvider>
    </WalletProvider>
  )
}
