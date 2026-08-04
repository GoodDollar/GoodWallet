"use client"

import { useEffect } from "react"

import { setBottomSheetProps } from "@/components/Snippet/BottomSheet/bottomSheetStore"
import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import { useSessionContext } from "@/login/hooks/context"

import type { WidgetHostProps } from "./hostTypes"
import { useWidgetProvider, WidgetProvider } from "./provider/WidgetProvider"
import { type RegisteredWidget, widgetRegistry } from "./registry"
import { WidgetRenderer } from "./WidgetRenderer"

export const AuthenticatedWidgetRoute = ({
  widgetId,
  themeOverrides,
  config,
  backendUrl,
  fundingVaultAddress,
}: {
  widgetId: string
  themeOverrides?: WidgetHostProps["themeOverrides"]
  config?: WidgetHostProps["config"]
  backendUrl?: string
  fundingVaultAddress?: string
}) => {
  const { signer, isLoading } = useSessionContext()
  const widget = widgetRegistry.get(widgetId)

  useEffect(() => {
    if (widget) {
      setBottomSheetProps({
        title: widget.displayName,
        subtitle: widget.description,
      })
    }
    return () => setBottomSheetProps({})
  }, [widget])

  if (!widget) throw new Error(`Unknown widget route: ${widgetId}`)
  if (isLoading) return <LoadingSpinner />
  if (!signer?.EVM) return null

  return (
    <WidgetProvider
      chainIds={widget.providerPolicy.chainIds}
      requiredMethods={widget.providerPolicy.requiredMethods}
    >
      <MountedWidget
        widget={widget}
        themeOverrides={themeOverrides}
        config={config}
        backendUrl={backendUrl}
        fundingVaultAddress={fundingVaultAddress}
      />
    </WidgetProvider>
  )
}

const MountedWidget = ({
  widget,
  themeOverrides,
  config,
  backendUrl,
  fundingVaultAddress,
}: {
  widget: RegisteredWidget
  themeOverrides?: WidgetHostProps["themeOverrides"]
  config?: WidgetHostProps["config"]
  backendUrl?: string
  fundingVaultAddress?: string
}) => {
  const provider = useWidgetProvider()

  return (
    <WidgetRenderer
      widget={widget}
      provider={provider}
      themeOverrides={themeOverrides}
      config={config}
      backendUrl={backendUrl}
      fundingVaultAddress={fundingVaultAddress}
    />
  )
}
