import type { ComponentType } from "react"

import type { RestrictedEip1193Provider } from "./provider/RestrictedEip1193Provider"

/**
 * This is the complete wallet-to-widget contract for both host implementations.
 * Widgets do not receive a signer, seed, RPC client, or wallet session object.
 */
export type WidgetHostProps = {
  provider: RestrictedEip1193Provider
  themeOverrides?: Record<string, unknown>
  config?: Record<string, unknown>
}

/**
 * Registry loaders deliberately return an untyped module because independently
 * released widgets are normalized by the host before they are rendered.
 */
export type ReactWidgetLoader = () => Promise<Record<string, unknown>>

export type HostedReactWidget = ComponentType<WidgetHostProps>

/**
 * The element module must register its declared tag only after the host mounts
 * in the browser, avoiding Custom Element evaluation during server rendering.
 */
export type WebComponentWidgetLoader = () => Promise<{
  register: (tagName?: string) => string | Promise<string>
}>

/**
 * Widget values are object properties, rather than HTML attributes, so the
 * restricted provider never appears in serialized markup.
 */
export type HostedWidgetElement = HTMLElement & {
  provider: RestrictedEip1193Provider | null
  themeOverrides?: Record<string, unknown>
  config?: Record<string, unknown>
}
