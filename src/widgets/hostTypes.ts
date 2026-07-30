import type { ComponentType } from "react"

import type { RestrictedEip1193Provider } from "./provider/RestrictedEip1193Provider"

export type WidgetHostProps = {
  provider: RestrictedEip1193Provider
  themeOverrides?: Record<string, unknown>
  config?: Record<string, unknown>
}

export type ReactWidgetLoader = () => Promise<Record<string, unknown>>

export type HostedReactWidget = ComponentType<WidgetHostProps>

export type WebComponentWidgetLoader = () => Promise<{
  register: (tagName?: string) => string | Promise<string>
}>

export type HostedWidgetElement = HTMLElement & {
  provider: RestrictedEip1193Provider | null
  themeOverrides?: Record<string, unknown>
  config?: Record<string, unknown>
}
