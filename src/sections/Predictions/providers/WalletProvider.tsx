"use client"

import { type ReactNode, useEffect, useState } from "react"
import { useSnapshot } from "valtio"
import {
  createPublicClient,
  createWalletClient,
  http,
  type WalletClient,
} from "viem"
import { polygon } from "viem/chains"

import { sessionState } from "@/login/context/SessionContext/storage"
import { getViemAccount } from "@/sections/Swap/adapters/viemWalletAdapter"

import { POLYGON_RPC_URL } from "../constants/polymarket"
import { WalletContext } from "./WalletContext"

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(POLYGON_RPC_URL),
})

function WalletContextProvider({ children }: { children: ReactNode }) {
  const session = useSnapshot(sessionState).session
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null)

  const authenticated = session !== null
  const eoaAddress = session?.signer.EVM.address as `0x${string}`

  useEffect(() => {
    if (!session) {
      setWalletClient(null)
      return
    }

    try {
      const account = getViemAccount(session.signer.EVM)

      // signerFrom() in @polymarket/client/viem adapts this wallet client into
      // the SDK's Signer, so no ethers shim is needed any more.
      setWalletClient(
        createWalletClient({
          account,
          chain: polygon,
          transport: http(POLYGON_RPC_URL),
        }),
      )
    } catch (err) {
      console.error("Failed to initialize wallet client:", err)
      setWalletClient(null)
    }
    // Only depend on eoaAddress (stable string) - not session object
  }, [session])

  return (
    <WalletContext.Provider
      value={{
        eoaAddress,
        walletClient,
        publicClient,
        isReady: session !== null,
        authenticated,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export default function Provider({ children }: { children: ReactNode }) {
  return <WalletContextProvider>{children}</WalletContextProvider>
}
