"use client"

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react"

import { useSessionContext } from "@/login"

import { RestrictedEip1193Provider } from "./RestrictedEip1193Provider"

const WidgetProviderContext = createContext<RestrictedEip1193Provider | null>(
  null,
)

// This is the only bridge from the authenticated custodial session to widget
// code. Consumers receive the restricted EIP-1193 facade, never the signer.
export const WidgetProvider = ({
  chainIds,
  requiredMethods,
  children,
}: {
  chainIds: readonly number[]
  requiredMethods: readonly string[]
  children: ReactNode
}) => {
  const { signer } = useSessionContext()
  const evmSigner = signer?.EVM
  const provider = useMemo(
    () =>
      evmSigner
        ? new RestrictedEip1193Provider({
            signer: evmSigner,
            chainIds,
            requiredMethods,
          })
        : null,
    [evmSigner, chainIds, requiredMethods],
  )

  useEffect(() => {
    if (provider && evmSigner) provider.updateAccount(evmSigner)
  }, [provider, evmSigner])

  if (!provider) return null
  return (
    <WidgetProviderContext.Provider value={provider}>
      {children}
    </WidgetProviderContext.Provider>
  )
}

export const useWidgetProvider = (): RestrictedEip1193Provider => {
  const provider = useContext(WidgetProviderContext)
  if (!provider) {
    throw new Error("useWidgetProvider must be used inside WidgetProvider")
  }
  return provider
}
