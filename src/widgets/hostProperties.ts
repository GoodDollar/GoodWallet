import type { HostedWidgetElement, WidgetHostProps } from "./hostTypes"

export const assignHostedWidgetProperties = (
  element: HostedWidgetElement,
  { provider, themeOverrides, config }: WidgetHostProps,
): void => {
  element.provider = provider
  element.themeOverrides = themeOverrides
  element.config = config
}

export const clearHostedWidgetProperties = (
  element: HostedWidgetElement,
): void => {
  element.provider = null
  element.themeOverrides = undefined
  element.config = undefined
}
