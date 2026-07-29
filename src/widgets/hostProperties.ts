import type { HostedWidgetElement, WidgetHostProps } from "./hostTypes"

/**
 * Hands the non-serializable wallet capability to the mounted Custom Element.
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
 * Removes wallet-owned references before a detached element can retain them.
 */
export const clearHostedWidgetProperties = (
  element: HostedWidgetElement,
): void => {
  element.provider = null
  element.themeOverrides = undefined
  element.config = undefined
}
