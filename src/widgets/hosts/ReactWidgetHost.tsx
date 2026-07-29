"use client"

import { useEffect, useState } from "react"

import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"

import type {
  HostedReactWidget,
  ReactWidgetLoader,
  WidgetHostProps,
} from "../hostTypes"
import { resolveReactWidget } from "../resolveReactWidget"

/**
 * Generic adapter for every GoodWidget React entry.
 *
 * The registry owns the static import, while this component owns only loading
 * and passing the common host contract. There should be no widget-specific
 * callback, selector, or transaction logic in this adapter.
 */
export const ReactWidgetHost = ({
  load,
  exportName,
  ...hostProps
}: WidgetHostProps & {
  load: ReactWidgetLoader
  exportName: string
}) => {
  const [Component, setComponent] = useState<HostedReactWidget | null>(null)
  const [loadError, setLoadError] = useState<Error | null>(null)

  useEffect(() => {
    let active = true

    load()
      .then((module) => {
        if (!active) return
        const exportedComponent = resolveReactWidget(module, exportName)
        // React treats a function passed directly to a state setter as an
        // updater, so wrap the loaded component in another function.
        setComponent(() => exportedComponent)
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoadError(
          error instanceof Error
            ? error
            : new Error("Unable to load the widget React entry"),
        )
      })

    // A slow dynamic import may finish after navigation. Ignoring that result
    // prevents state updates against an unmounted bottom-sheet route.
    return () => {
      active = false
    }
  }, [exportName, load])

  if (loadError) throw loadError
  if (!Component) return <LoadingSpinner />

  return <Component {...hostProps} />
}
