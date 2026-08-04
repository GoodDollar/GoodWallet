import type { HostedWidgetElement, WidgetHostProps } from "./hostTypes"

/**
 * Assign the shared host contract without serializing capability objects into
 * markup. Kept as a small pure helper so the security-sensitive handoff can be
 * tested without constructing a browser Custom Element.
 */
export const assignHostedWidgetProperties = (
  element: HostedWidgetElement,
  { provider, themeOverrides, config }: WidgetHostProps,
): void => {
  element.provider = provider
  element.themeOverrides = themeOverrides
  element.config = config
}

/**
 * Drop references owned by the Wallet whenever the host element is replaced or
 * unmounted. This does not revoke the session itself; it prevents a detached
 * widget element from retaining the provider capability.
 */
export const clearHostedWidgetProperties = (
  element: HostedWidgetElement,
): void => {
  element.provider = null
  element.themeOverrides = undefined
  element.config = undefined
}
