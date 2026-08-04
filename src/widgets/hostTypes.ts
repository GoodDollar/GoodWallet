import type { ComponentType } from "react"

import type { RestrictedEip1193Provider } from "./provider/RestrictedEip1193Provider"

export type WidgetHostProps = {
  provider: RestrictedEip1193Provider
  themeOverrides?: Record<string, unknown>
  config?: Record<string, unknown>
  backendUrl?: string
  fundingVaultAddress?: string
}

export type WidgetModuleMetadata = {
  packageName: string
  packageVersion: string
}

export type WidgetModule = {
  goodWidgetMetadata: WidgetModuleMetadata
}

export type ReactWidgetModule = Record<string, unknown> & WidgetModule

export type ReactWidgetLoader = () => Promise<ReactWidgetModule>

export type HostedReactWidget = ComponentType<WidgetHostProps>

export type WebComponentWidgetModule = WidgetModule & {
  register: (tagName?: string) => string | Promise<string>
}

export type WebComponentWidgetLoader = () => Promise<WebComponentWidgetModule>

export const assertWidgetModuleMetadata = (
  module: WidgetModule,
  packageName: string,
  packageVersion: string,
): void => {
  const metadata = module.goodWidgetMetadata
  if (
    !metadata ||
    metadata.packageName !== packageName ||
    metadata.packageVersion !== packageVersion
  ) {
    throw new Error(
      `Widget module identity mismatch: expected ${packageName}@${packageVersion}`,
    )
  }
}

export type HostedWidgetElement = HTMLElement & {
  provider: RestrictedEip1193Provider | null
  themeOverrides?: Record<string, unknown>
  config?: Record<string, unknown>
  backendUrl?: string
  fundingVaultAddress?: string
}
