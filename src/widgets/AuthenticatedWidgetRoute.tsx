"use client"

import { useEffect } from "react"

import { setBottomSheetProps } from "@/components/Snippet/BottomSheet/bottomSheetStore"
import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import { useSessionContext } from "@/login"

import type { WidgetHostProps } from "./hostTypes"
import { useWidgetProvider, WidgetProvider } from "./provider/WidgetProvider"
import { type RegisteredWidget, widgetRegistry } from "./registry"
import { WidgetRenderer } from "./WidgetRenderer"

export const AuthenticatedWidgetRoute = ({
  widgetId,
  themeOverrides,
  config,
}: {
  widgetId: string
  themeOverrides?: WidgetHostProps["themeOverrides"]
  config?: WidgetHostProps["config"]
}) => {
  const { signer, isLoading } = useSessionContext()
  const widget = widgetRegistry.get(widgetId)

  // Bottom-sheet metadata comes from the same reviewed registry entry that
  // controls provider permissions, avoiding route-specific duplicate config.
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
  // Never mount in-process widget code until the wallet session is available.
  if (!signer) return null

  return (
    <WidgetProvider
      chainIds={widget.providerPolicy.chainIds}
      requiredMethods={widget.providerPolicy.requiredMethods}
    >
      <AuthenticatedWidget
        widget={widget}
        themeOverrides={themeOverrides}
        config={config}
      />
    </WidgetProvider>
  )
}

/**
 * This child runs only inside WidgetProvider, so both integration modes receive
 * exactly the same restricted EIP-1193 instance. Neither host can access the
 * custodial signer held by the surrounding session.
 */
const AuthenticatedWidget = ({
  widget,
  themeOverrides,
  config,
}: {
  widget: RegisteredWidget
  themeOverrides?: WidgetHostProps["themeOverrides"]
  config?: WidgetHostProps["config"]
}) => {
  // This hook is the only point where the restricted capability enters the
  // rendering branch selected by WidgetRenderer.
  const provider = useWidgetProvider()

  return (
    <WidgetRenderer
      widget={widget}
      provider={provider}
      themeOverrides={themeOverrides}
      config={config}
    />
  )
}
