"use client"

import { createElement, useEffect, useRef, useState } from "react"

import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"

import {
  assignHostedWidgetProperties,
  clearHostedWidgetProperties,
} from "../hostProperties"
import type {
  HostedWidgetElement,
  WebComponentWidgetLoader,
  WidgetHostProps,
} from "../hostTypes"

/**
 * Registers and mounts a widget Custom Element exclusively on the client.
 */
export const WebComponentWidgetHost = ({
  load,
  tagName,
  provider,
  themeOverrides,
  config,
}: WidgetHostProps & {
  load: WebComponentWidgetLoader
  tagName: string
}) => {
  const elementRef = useRef<HostedWidgetElement | null>(null)
  const [registeredTagName, setRegisteredTagName] = useState<string | null>(
    null,
  )
  const [loadError, setLoadError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true

    // Element classes may depend on HTMLElement at module evaluation time.
    load()
      .then(async (module) => {
        const registered = await module.register(tagName)
        if (!isMounted) return
        if (registered !== tagName) {
          throw new Error(
            `Widget registered ${registered}; expected declared tag ${tagName}`,
          )
        }
        setRegisteredTagName(registered)
      })
      .catch((error: unknown) => {
        if (!isMounted) return
        setLoadError(
          error instanceof Error
            ? error
            : new Error("Unable to register the widget Custom Element"),
        )
      })

    return () => {
      isMounted = false
    }
  }, [load, tagName])

  useEffect(() => {
    const element = elementRef.current
    if (!element || !registeredTagName) return

    // Object assignment preserves provider identity and prevents HTML leakage.
    assignHostedWidgetProperties(element, {
      provider,
      themeOverrides,
      config,
    })

    return () => {
      clearHostedWidgetProperties(element)
    }
  }, [config, provider, registeredTagName, themeOverrides])

  if (loadError) throw loadError
  if (!registeredTagName) return <LoadingSpinner />

  return createElement(registeredTagName, {
    ref: (element: HTMLElement | null) => {
      elementRef.current = element as HostedWidgetElement | null
    },
  })
}
