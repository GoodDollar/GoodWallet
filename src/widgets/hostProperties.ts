import type { HostedWidgetElement, WidgetHostProps } from "./hostTypes"

export const assignHostedWidgetProperties = (
  element: HostedWidgetElement,
  {
    provider,
    themeOverrides,
    config,
    backendUrl,
    fundingVaultAddress,
  }: WidgetHostProps,
): void => {
  element.provider = provider
  element.themeOverrides = themeOverrides
  element.config = config
  element.backendUrl = backendUrl
  element.fundingVaultAddress = fundingVaultAddress
}

export const clearHostedWidgetProperties = (
  element: HostedWidgetElement,
): void => {
  element.provider = null
  element.themeOverrides = undefined
  element.config = undefined
  element.backendUrl = undefined
  element.fundingVaultAddress = undefined
}
