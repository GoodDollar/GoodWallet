import type { HostedWidgetElement, WidgetHostProps } from "./hostTypes"

const ELEMENT_PROP_KEYS = new WeakMap<object, string[]>()

export const assignHostedWidgetProperties = (
  element: HostedWidgetElement,
  { provider, themeOverrides, config, elementProps }: WidgetHostProps,
): void => {
  clearElementProps(element)

  element.provider = provider
  element.themeOverrides = themeOverrides
  element.config = config

  const keys: string[] = []
  if (elementProps) {
    for (const [key, value] of Object.entries(elementProps)) {
      if (value === undefined) continue
      ;(element as HostedWidgetElement & Record<string, unknown>)[key] = value
      keys.push(key)
    }
  }
  ELEMENT_PROP_KEYS.set(element, keys)
}

export const clearHostedWidgetProperties = (
  element: HostedWidgetElement,
): void => {
  clearElementProps(element)
  element.provider = null
  element.themeOverrides = undefined
  element.config = undefined
}

const clearElementProps = (element: HostedWidgetElement): void => {
  const keys = ELEMENT_PROP_KEYS.get(element)
  if (!keys) return
  for (const key of keys) {
    ;(element as HostedWidgetElement & Record<string, unknown>)[key] = undefined
  }
  ELEMENT_PROP_KEYS.delete(element)
}
