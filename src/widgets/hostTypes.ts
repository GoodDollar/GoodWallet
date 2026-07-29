import type { ComponentType } from "react"

import type { RestrictedEip1193Provider } from "./provider/RestrictedEip1193Provider"

/**
 * The deliberately small contract shared by the React and Web Component hosts.
 *
 * Widget-specific actions and UI state do not belong here. Both integration
 * modes receive the same restricted provider and optional public appearance
 * configuration, which keeps changing modes from changing wallet authority.
 */
export type WidgetHostProps = {
  provider: RestrictedEip1193Provider
  themeOverrides?: Record<string, unknown>
  config?: Record<string, unknown>
}

/**
 * A registry loader returns the package module while the separately reviewed
 * export name selects its component. Keeping a literal import expression in
 * source lets Next.js discover and split the package at build time.
 *
 * The module is intentionally not typed as one widget's prop interface:
 * GoodWallet hosts many independently published packages and normalizes them
 * to WidgetHostProps only after validating that the declared export exists.
 */
export type ReactWidgetLoader = () => Promise<Record<string, unknown>>

export type HostedReactWidget = ComponentType<WidgetHostProps>

/**
 * Registration is loaded only after the route reaches the browser. This avoids
 * evaluating Custom Element code during Next.js server rendering. The return
 * type accepts both legacy synchronous packages and newer packages that defer
 * their element import until after the browser check.
 */
export type WebComponentWidgetLoader = () => Promise<{
  register: (tagName?: string) => string | Promise<string>
}>

/**
 * JavaScript objects cannot be represented safely as HTML attributes. The Web
 * Component host assigns these properties directly after the element mounts.
 */
export type HostedWidgetElement = HTMLElement & {
  provider: RestrictedEip1193Provider | null
  themeOverrides?: Record<string, unknown>
  config?: Record<string, unknown>
}
