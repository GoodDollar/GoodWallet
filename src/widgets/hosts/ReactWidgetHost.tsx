"use client"

import { useEffect, useState } from "react"

import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"

import {
  assertWidgetModuleMetadata,
  type HostedReactWidget,
  type ReactWidgetLoader,
  type WidgetHostProps,
} from "../hostTypes"
import { resolveReactWidget } from "../resolveReactWidget"

export const ReactWidgetHost = ({
  load,
  exportName,
  packageName,
  packageVersion,
  ...hostProps
}: WidgetHostProps & {
  load: ReactWidgetLoader
  exportName: string
  packageName: string
  packageVersion: string
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
        assertWidgetModuleMetadata(module, packageName)
        const exportedComponent = resolveReactWidget(module, exportName)
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
  }, [exportName, load, packageName, packageVersion])

  if (loadError) throw loadError
  if (!Component) return <LoadingSpinner />

  return <Component {...hostProps} />
}
