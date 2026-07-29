import type { ReactNode } from "react"
import type { IconName } from "ui"

import type { ReactWidgetLoader, WebComponentWidgetLoader } from "./hostTypes"
import {
  WIDGET_EVM_CHAIN_IDS,
  WIDGET_PROVIDER_METHODS,
} from "./provider/policy"

export type WidgetIntegrationMode = "web-component" | "react"

/**
 * Custom Elements are the normal plugin boundary; React is an explicit,
 * reviewed exception for packages which cannot expose a Custom Element.
 */
export const DEFAULT_WIDGET_INTEGRATION_MODE: WidgetIntegrationMode =
  "web-component"

export type DashboardIcon =
  | { kind: "system"; name: IconName }
  | { kind: "local"; render: () => ReactNode }

export type DashboardAction = {
  id: string
  routeSlug: string
  label: string
  icon: DashboardIcon
  widgetId?: string
}

/**
 * A registry entry is reviewed source rather than remote widget metadata.
 * This prevents a package or its manifest from enlarging wallet authority.
 */
export type RegisteredWidget = {
  widgetId: `goodwidget.${string}`
  packageName: `@goodwidget/${string}`
  packageVersion: `${number}.${number}.${number}`
  integrationMode?: WidgetIntegrationMode
  entries: {
    react: { exportName: string; load: ReactWidgetLoader }
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
    chainIds: readonly number[]
    requiredMethods: readonly string[]
  }
}

export const defineWidget = <const T extends RegisteredWidget>(widget: T): T =>
  widget

export const resolveWidgetIntegrationMode = (
  widget: RegisteredWidget,
): WidgetIntegrationMode =>
  widget.integrationMode ?? DEFAULT_WIDGET_INTEGRATION_MODE

const EXACT_PACKAGE_VERSION = /^\d+\.\d+\.\d+$/
const ROUTE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Validates every security-sensitive registry field before it becomes routable.
 */
const validateWidget = (widget: RegisteredWidget): void => {
  if (!EXACT_PACKAGE_VERSION.test(widget.packageVersion)) {
    throw new Error(
      `Widget ${widget.widgetId} must use an exact package version`,
    )
  }
  if (!ROUTE_SLUG.test(widget.routeSlug)) {
    throw new Error(`Widget ${widget.widgetId} has an invalid route slug`)
  }
  const unsupportedChains = widget.providerPolicy.chainIds.filter(
    (chainId) => !WIDGET_EVM_CHAIN_IDS.has(chainId),
  )
  if (unsupportedChains.length > 0) {
    throw new Error(
      `Widget ${widget.widgetId} requests unsupported chains: ${unsupportedChains.join(", ")}`,
    )
  }
  if (
    new Set(widget.providerPolicy.chainIds).size !==
    widget.providerPolicy.chainIds.length
  ) {
    throw new Error(`Widget ${widget.widgetId} repeats a provider chain`)
  }
  const unsupportedMethods = widget.providerPolicy.requiredMethods.filter(
    (method) => !WIDGET_PROVIDER_METHODS.has(method),
  )
  if (unsupportedMethods.length > 0) {
    throw new Error(
      `Widget ${widget.widgetId} requests unsupported methods: ${unsupportedMethods.join(", ")}`,
    )
  }
}

/**
 * Creates both identity and route indexes, rejecting collisions at module load.
 */
export const createWidgetRegistry = (
  widgets: readonly RegisteredWidget[],
): ReadonlyMap<string, RegisteredWidget> => {
  const registry = new Map<string, RegisteredWidget>()
  const routes = new Set<string>()

  for (const widget of widgets) {
    validateWidget(widget)
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

/**
 * Add a released package only with literal import loaders and its exact version.
 * No package is registered until a reviewed widget-specific follow-up exists.
 */
export const WIDGETS: readonly RegisteredWidget[] = []
export const widgetRegistry = createWidgetRegistry(WIDGETS)

export const getWidgetByRoute = (
  routeSlug: string,
): RegisteredWidget | undefined =>
  WIDGETS.find((widget) => widget.routeSlug === routeSlug)

/**
 * These six action IDs preserve the existing dashboard order and behavior.
 */
export const coreDashboardActions = [
  {
    id: "gooddollar",
    routeSlug: "gooddollar",
    label: "GoodDollar",
    icon: { kind: "system", name: "goodDollarLogo" },
  },
  {
    id: "send",
    routeSlug: "send",
    label: "Send",
    icon: { kind: "system", name: "ArrowUpAlt" },
  },
  {
    id: "receive",
    routeSlug: "receive",
    label: "Receive",
    icon: { kind: "system", name: "ArrowDownAlt" },
  },
  {
    id: "swap",
    routeSlug: "swap",
    label: "Swap",
    icon: { kind: "system", name: "Swap" },
  },
  {
    id: "predictions",
    routeSlug: "predictions",
    label: "Predictions",
    icon: { kind: "system", name: "Predictions" },
  },
  {
    id: "walletconnect",
    routeSlug: "walletconnect",
    label: "WalletConnect",
    icon: { kind: "system", name: "walletConnectLogo" },
  },
] as const satisfies readonly DashboardAction[]

/**
 * Widgets join the existing responsive action list after the six core actions.
 */
export const widgetDashboardActions = WIDGETS.map(
  (widget): DashboardAction => ({
    id: widget.widgetId,
    widgetId: widget.widgetId,
    routeSlug: widget.routeSlug,
    label: widget.displayName,
    icon: widget.icon,
  }),
)
