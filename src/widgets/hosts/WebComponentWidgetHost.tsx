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

type TagRegistration = {
  load: WebComponentWidgetLoader
  promise: Promise<string>
}

const registrationCache = new Map<string, TagRegistration>()

export const registerElement = (
  load: WebComponentWidgetLoader,
  tagName: string,
): Promise<string> => {
  const existingDefinition = customElements.get(tagName)
  const cached = registrationCache.get(tagName)
  if (cached) {
    if (cached.load !== load) {
      return Promise.reject(
        new Error(`Custom Element tag ${tagName} is already registered`),
      )
    }
    return cached.promise
  }
  if (existingDefinition) {
    return Promise.reject(
      new Error(`Custom Element tag ${tagName} is already registered`),
    )
  }

  const promise = load()
    .then(async (module) => {
      const registered = await module.register(tagName)
      if (registered !== tagName) {
        throw new Error(
          `Widget registered ${registered}; expected declared tag ${tagName}`,
        )
      }
      if (!customElements.get(tagName)) {
        throw new Error(`Widget did not register Custom Element ${tagName}`)
      }
      return registered
    })
    .catch((error: unknown) => {
      registrationCache.delete(tagName)
      throw error
    })

  registrationCache.set(tagName, { load, promise })
  return promise
}

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
    setRegisteredTagName(null)
    setLoadError(null)

    registerElement(load, tagName)
      .then((registered) => {
        if (!isMounted) return
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
