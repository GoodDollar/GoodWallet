"use client"

import { useEffect } from "react"

import { setBottomSheetProps } from "@/components/Snippet/BottomSheet/bottomSheetStore"
import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import { useSessionContext } from "@/login/hooks/context"

import type { WidgetHostProps } from "./hostTypes"
import { useWidgetProvider, WidgetProvider } from "./provider/WidgetProvider"
import { type RegisteredWidget, widgetRegistry } from "./registry"
import { WidgetRenderer } from "./WidgetRenderer"

/**
 * Requires an authenticated wallet session before any widget package is loaded.
 */
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
      key={widget.widgetId}
      chainIds={widget.providerPolicy.chainIds}
      requiredMethods={widget.providerPolicy.requiredMethods}
    >
      <MountedWidget
        widget={widget}
        themeOverrides={themeOverrides}
        config={config}
      />
    </WidgetProvider>
  )
}

/**
 * The provider capability enters the renderer only after authentication.
 */
const MountedWidget = ({
  widget,
  themeOverrides,
  config,
}: {
  widget: RegisteredWidget
  themeOverrides?: WidgetHostProps["themeOverrides"]
  config?: WidgetHostProps["config"]
}) => {
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
