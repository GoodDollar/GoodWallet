"use client"

import { createElement, useEffect, useRef, useState } from "react"

import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"

import {
  assignHostedWidgetProperties,
  clearHostedWidgetProperties,
} from "../hostProperties"
import {
  assertWidgetModuleMetadata,
  type HostedWidgetElement,
  type WebComponentWidgetLoader,
  type WidgetHostProps,
} from "../hostTypes"

type TagRegistration = {
  load: WebComponentWidgetLoader
  packageName: string
  packageVersion: string
  promise: Promise<string>
}

const registrationCache = new Map<string, TagRegistration>()

export const registerElement = (
  load: WebComponentWidgetLoader,
  tagName: string,
  packageName: string,
  packageVersion: string,
): Promise<string> => {
  const cached = registrationCache.get(tagName)
  if (cached) {
    if (
      cached.load !== load ||
      cached.packageName !== packageName ||
      cached.packageVersion !== packageVersion
    ) {
      return Promise.reject(
        new Error(`Custom Element tag ${tagName} is already registered`),
      )
    }
    return cached.promise
  }
  if (customElements.get(tagName)) {
    const settled = Promise.resolve(tagName)
    registrationCache.set(tagName, {
      load,
      packageName,
      packageVersion,
      promise: settled,
    })
    return settled
  }

  const promise = load()
    .then(async (module) => {
      assertWidgetModuleMetadata(module, packageName, packageVersion)
      if (customElements.get(tagName)) {
        return tagName
      }
      try {
        const registered = await module.register(tagName)
        if (registered !== tagName) {
          throw new Error(
            `Widget registered ${registered}; expected declared tag ${tagName}`,
          )
        }
      } catch (error: unknown) {
        if (!customElements.get(tagName)) {
          throw error
        }
      }
      if (!customElements.get(tagName)) {
        throw new Error(`Widget did not register Custom Element ${tagName}`)
      }
      return tagName
    })
    .catch((error: unknown) => {
      registrationCache.delete(tagName)
      throw error
    })

  registrationCache.set(tagName, {
    load,
    packageName,
    packageVersion,
    promise,
  })
  return promise
}

export const WebComponentWidgetHost = ({
  load,
  tagName,
  packageName,
  packageVersion,
  provider,
  themeOverrides,
  config,
}: WidgetHostProps & {
  load: WebComponentWidgetLoader
  tagName: string
  packageName: string
  packageVersion: string
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

    registerElement(load, tagName, packageName, packageVersion)
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
  }, [load, packageName, packageVersion, tagName])

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
