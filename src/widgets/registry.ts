import type { ReactNode } from "react"
import type { IconName } from "ui"

import type { ReactWidgetLoader, WebComponentWidgetLoader } from "./hostTypes"

export type WidgetIntegrationMode = "web-component" | "react"

/**
 * Web Components are the plug-in-oriented default for the Wallet web target.
 * An individual reviewed registry item can override this to `react` without
 * requiring a new package release.
 */
export const DEFAULT_WIDGET_INTEGRATION_MODE: WidgetIntegrationMode =
  "web-component"

// Widget icons may come from the wallet's design system or a reviewed local
// asset, so onboarding a widget does not require expanding a global icon enum.
export type DashboardIcon =
  | { kind: "system"; name: IconName }
  | { kind: "local"; render: () => ReactNode }

export type DashboardActionId =
  | "gooddollar"
  | "send"
  | "receive"
  | "swap"
  | "predictions"
  | "walletconnect"
  | (string & {})

export type DashboardAction = {
  id: DashboardActionId
  routeSlug: string
  label: string
  icon: DashboardIcon
  placement: "primary" | "more"
  widgetId?: string
}

export type RegisteredWidget = {
  // Package identity and entry capabilities come from the verified descriptor.
  // Mode, presentation, and provider policy remain reviewed Wallet decisions.
  widgetId: `goodwidget.${string}`
  packageName: `@goodwidget/${string}`
  packageVersion: `${number}.${number}.${number}`
  integrationMode?: WidgetIntegrationMode
  entries: {
    react: {
      exportName: string
      load: ReactWidgetLoader
    }
    webComponent: {
      tagName: `${string}-${string}`
      load: WebComponentWidgetLoader
    }
  }
  routeSlug: string
  displayName: string
  description: string
  icon: DashboardIcon
  providerPolicy: {
    // The release descriptor cannot populate or broaden this security boundary.
    chainIds: readonly number[]
    requiredMethods: readonly string[]
  }
}

export const defineWidget = <const T extends RegisteredWidget>(widget: T): T =>
  widget

// Centralizing default resolution makes the chosen mode easy to test and keeps
// routes from quietly inventing their own fallback behavior.
export const resolveWidgetIntegrationMode = (
  widget: RegisteredWidget,
): WidgetIntegrationMode =>
  widget.integrationMode ?? DEFAULT_WIDGET_INTEGRATION_MODE

// Build-time duplicate checks prevent two independently generated integrations
// from claiming the same immutable identity or user-facing route.
export const createWidgetRegistry = (
  widgets: readonly RegisteredWidget[],
): ReadonlyMap<string, RegisteredWidget> => {
  const registry = new Map<string, RegisteredWidget>()
  const routes = new Set<string>()

  for (const widget of widgets) {
    if (registry.has(widget.widgetId)) {
      throw new Error(`Duplicate widget ID: ${widget.widgetId}`)
    }
    if (routes.has(widget.routeSlug)) {
      throw new Error(`Duplicate widget route: ${widget.routeSlug}`)
    }
    registry.set(widget.widgetId, widget)
    routes.add(widget.routeSlug)
  }
  return registry
}

// Integrations are added by reviewed PRs after a stable package release. Do not
// add speculative or non-published versions here.
export const WIDGETS = [] as const satisfies readonly RegisteredWidget[]
export const widgetRegistry = createWidgetRegistry(WIDGETS)

// Core wallet actions use the same dashboard model as widgets. This keeps the
// layout registry-driven while preserving the existing wallet routes.
export const coreDashboardActions = [
  {
    id: "gooddollar",
    routeSlug: "gooddollar",
    label: "GoodDollar",
    icon: { kind: "system", name: "goodDollarLogo" },
    placement: "primary",
  },
  {
    id: "send",
    routeSlug: "send",
    label: "Send",
    icon: { kind: "system", name: "ArrowUpAlt" },
    placement: "primary",
  },
  {
    id: "receive",
    routeSlug: "receive",
    label: "Receive",
    icon: { kind: "system", name: "ArrowDownAlt" },
    placement: "primary",
  },
  {
    id: "swap",
    routeSlug: "swap",
    label: "Swap",
    icon: { kind: "system", name: "Swap" },
    placement: "primary",
  },
  {
    id: "predictions",
    routeSlug: "predictions",
    label: "Predictions",
    icon: { kind: "system", name: "Predictions" },
    placement: "primary",
  },
  {
    id: "walletconnect",
    routeSlug: "walletconnect",
    label: "WalletConnect",
    icon: { kind: "system", name: "walletConnectLogo" },
    placement: "primary",
  },
] as const satisfies readonly DashboardAction[]

const registeredWidgets: readonly RegisteredWidget[] = WIDGETS

export const widgetDashboardActions = registeredWidgets.map(
  (widget): DashboardAction => ({
    id: widget.widgetId,
    widgetId: widget.widgetId,
    routeSlug: widget.routeSlug,
    label: widget.displayName,
    icon: widget.icon,
    placement: "more",
  }),
)
