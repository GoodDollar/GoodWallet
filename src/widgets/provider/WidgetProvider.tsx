"use client"

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react"

import { useSessionContext } from "@/login/hooks/context"
import { openWalletConnectDialog } from "@/sections/WalletConnect/store/walletConnectDialogStore"

import {
  RestrictedEip1193Provider,
  type WalletApprovalRequest,
} from "./RestrictedEip1193Provider"

const WidgetProviderContext = createContext<RestrictedEip1193Provider | null>(
  null,
)

const requestWalletApproval = async (
  request: WalletApprovalRequest,
): Promise<boolean> => {
  const status = await openWalletConnectDialog({
    type: "generic",
    title: "Approve widget request",
    bodyText: JSON.stringify(
      {
        method: request.method,
        account: request.account,
        chainId: request.chainId,
        params: request.params,
      },
      (_key, value: unknown) =>
        typeof value === "bigint" ? `0x${value.toString(16)}` : value,
      2,
    ),
    acceptBtnText: "Approve",
    rejectBtnText: "Reject",
  })
  return status === "accepted"
}

/**
 * This is the sole bridge from an authenticated session into widget code.
 */
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
  const liveProviderRef = useRef<RestrictedEip1193Provider | null>(null)
  const provider = useMemo(
    () =>
      evmSigner
        ? new RestrictedEip1193Provider({
            signer: evmSigner,
            chainIds,
            requiredMethods,
            requestWalletApproval,
          })
        : null,
    [evmSigner, chainIds, requiredMethods],
  )

  useEffect(() => {
    liveProviderRef.current = provider
    return () => {
      const disposedProvider = provider
      if (liveProviderRef.current === disposedProvider) {
        liveProviderRef.current = null
      }
      queueMicrotask(() => {
        if (liveProviderRef.current === disposedProvider) return
        disposedProvider?.dispose()
      })
    }
  }, [provider])

  if (!provider || !evmSigner) return null
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
