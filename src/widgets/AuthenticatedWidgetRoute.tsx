"use client"

import { useEffect, useMemo } from "react"

import { setBottomSheetProps } from "@/components/Snippet/BottomSheet/bottomSheetStore"
import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import { config } from "@/config"
import { useSessionContext } from "@/login/hooks/context"
import type { EVMSigner } from "@/login/types"

import { useWidgetProvider, WidgetProvider } from "./provider/WidgetProvider"
import { type RegisteredWidget, widgetRegistry } from "./registry"
// import { createSuperfluidCitizenClaimExecution } from "./superfluidClaimExecution"
import { WidgetRenderer } from "./WidgetRenderer"

export const AuthenticatedWidgetRoute = ({
  widgetId,
}: {
  widgetId: string
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
      <MountedWidget widget={widget} evmSigner={signer.EVM} />
    </WidgetProvider>
  )
}

const MountedWidget = ({
  widget,
  evmSigner,
}: {
  widget: RegisteredWidget
  evmSigner: EVMSigner
}) => {
  const provider = useWidgetProvider()
  const elementProps = useMemo(() => {
    if (widget.widgetId !== "goodwidget.superfluid-campaign") {
      return widget.elementProps
    }

    return {
      ...widget.elementProps,
      citizenClaimEnvironment: config.g$claim.contracts,
      disableClaim: true,
    }
  }, [evmSigner, widget])

  return (
    <WidgetRenderer
      widget={widget}
      provider={provider}
      elementProps={elementProps}
    />
  )
}
