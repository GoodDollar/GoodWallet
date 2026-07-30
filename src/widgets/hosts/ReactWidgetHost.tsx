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
 * Loads a reviewed React entry only after this bottom-sheet route reaches the
 * browser and passes it the same limited contract as Custom Elements receive.
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
    let isMounted = true
    setComponent(null)
    setLoadError(null)

    load()
      .then((module) => {
        if (!isMounted) return
        const exportedComponent = resolveReactWidget(module, exportName)
        // Functions are React state updaters, so keep the component wrapped.
        setComponent(() => exportedComponent)
      })
      .catch((error: unknown) => {
        if (!isMounted) return
        setLoadError(
          error instanceof Error
            ? error
            : new Error("Unable to load the widget React entry"),
        )
      })

    return () => {
      isMounted = false
    }
  }, [exportName, load])

  if (loadError) throw loadError
  if (!Component) return <LoadingSpinner />

  return <Component {...hostProps} />
}
