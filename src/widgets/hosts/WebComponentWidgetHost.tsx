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
 * Generic browser adapter for every GoodWidget Custom Element.
 *
 * Shadow DOM keeps Wallet selectors out of widget internals. Intentional
 * appearance changes flow through inherited `--gw-*` variables or the
 * `themeOverrides` property assigned below.
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
    let active = true

    // Importing inside an effect is important: several widget entry points
    // create HTMLElement subclasses at module evaluation time and therefore
    // must never execute in the server-rendering environment.
    load()
      .then(async (module) => {
        if (!active) return
        // Promise.resolve-style awaiting keeps the host compatible with both
        // older synchronous register exports and SSR-safe async exports.
        const registered = await module.register(tagName)
        if (!active) return
        if (registered !== tagName) {
          throw new Error(
            `Widget registered ${registered}; expected declared tag ${tagName}`,
          )
        }
        setRegisteredTagName(registered)
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoadError(
          error instanceof Error
            ? error
            : new Error("Unable to register the widget Custom Element"),
        )
      })

    return () => {
      active = false
    }
  }, [load, tagName])

  useEffect(() => {
    const element = elementRef.current
    if (!element || !registeredTagName) return

    // Provider, config, and theme objects must be assigned as JavaScript
    // properties. Serializing them into attributes would lose object identity
    // and could accidentally expose internal values in rendered markup.
    assignHostedWidgetProperties(element, {
      provider,
      themeOverrides,
      config,
    })

    return () => {
      // Explicitly sever the capability reference when navigating away. The
      // element is also removed, but clearing it makes the lifetime obvious.
      clearHostedWidgetProperties(element)
    }
  }, [config, provider, registeredTagName, themeOverrides])

  if (loadError) throw loadError
  if (!registeredTagName) return <LoadingSpinner />

  // React can render standards-based custom-element tag names dynamically. A
  // callback ref gives us the real DOM node for safe property assignment.
  return createElement(registeredTagName, {
    ref: (node: HTMLElement | null) => {
      elementRef.current = node as HostedWidgetElement | null
    },
  })
}
