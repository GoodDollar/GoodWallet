// biome-ignore-all lint/suspicious/noExplicitAny: need to cast the window
"use client"

import { type ReactNode, useEffect, useState } from "react"
import type { JsonRpcSigner, TypedDataDomain, TypedDataField } from "ethers"
import { useSnapshot } from "valtio"
import {
  createPublicClient,
  createWalletClient,
  http,
  type WalletClient,
} from "viem"
import { polygon } from "viem/chains"

import type { EVMSigner } from "@/login"
import { sessionState } from "@/login/context/SessionContext/storage"
import { getViemAccount } from "@/sections/Swap/adapters/viemWalletAdapter"

import { POLYGON_RPC_URL } from "../constants/polymarket"
import { WalletContext } from "./WalletContext"

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(POLYGON_RPC_URL),
})

// Start with empty object - add functions as needed when errors occur here
const createEthersSignerWrapper = (_signer: EVMSigner) => {
  return {
    getAddress: () => _signer.address,
    _signTypedData: async (
      domain: TypedDataDomain,
      types: Record<string, TypedDataField[]>,
      value: Record<string, unknown>,
    ) => {
      return await _signer.signTypedData(domain, types, value)
    },
  }
}

function WalletContextProvider({ children }: { children: ReactNode }) {
  const session = useSnapshot(sessionState).session
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null)
  const [ethersSigner, setEthersSigner] = useState<JsonRpcSigner | null>(null)

  const authenticated = session !== null
  const eoaAddress = session?.signer.EVM.address as `0x${string}`

  useEffect(() => {
    if (!session) {
      setWalletClient(null)
      setEthersSigner(null)
      return
    }

    try {
      const account = getViemAccount(session.signer.EVM)

      const client = createWalletClient({
        account,
        chain: polygon,
        transport: http(POLYGON_RPC_URL),
      })
      setWalletClient(client)

      const ethersProvider = createEthersSignerWrapper(
        session.signer.EVM,
      ) as any
      setEthersSigner(ethersProvider)
    } catch (err) {
      console.error("Failed to initialize wallet client:", err)
      setWalletClient(null)
      setEthersSigner(null)
    }
    // Only depend on eoaAddress (stable string) - not session object
  }, [session])

  return (
    <WalletContext.Provider
      value={{
        eoaAddress,
        walletClient,
        ethersSigner,
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
