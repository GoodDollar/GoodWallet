import { createElement, type ReactNode } from "react"
import type { IconName } from "ui"

import {
  BASE_CHAIN_ID,
  CELO_CHAIN_ID,
  FUSE_CHAIN_ID,
  XDC_CHAIN_ID,
} from "@/chain/chain-ids"

import type { ReactWidgetLoader, WebComponentWidgetLoader } from "./hostTypes"
import { AiCreditsIcon } from "./icons/AiCreditsIcon"
import {
  WIDGET_EVM_CHAIN_IDS,
  WIDGET_PROVIDER_METHOD_LIST,
  WIDGET_PROVIDER_METHODS,
} from "./provider/policy"

export type WidgetIntegrationMode = "web-component" | "react"

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

const readBooleanEnv = (
  value: string | undefined,
  fallback: boolean,
): boolean => {
  if (value === undefined || value === "") return fallback
  return value === "true" || value === "1"
}

type RegisteredWidgetBase = {
  widgetId: `goodwidget.${string}`
  packageName: `@goodwidget/${string}`
  packageVersion: `${number}.${number}.${number}`
  routeSlug: string
  displayName: string
  description: string
  icon: DashboardIcon
  providerPolicy: {
    chainIds: readonly number[]
    requiredMethods: readonly string[]
  }
  elementProps?: Record<string, unknown>
  /** Controls the dashboard action only; routes remain registry-addressable. */
  dashboardVisible?: boolean
}

export type RegisteredWidget = RegisteredWidgetBase &
  (
    | {
        integrationMode?: "web-component"
        entry: {
          tagName: `${string}-${string}`
          load: WebComponentWidgetLoader
        }
      }
    | {
        integrationMode: "react"
        entry: { exportName: string; load: ReactWidgetLoader }
      }
  )

export const defineWidget = <const T extends RegisteredWidget>(widget: T): T =>
  widget

const EXACT_PACKAGE_VERSION = /^\d+\.\d+\.\d+$/
const ROUTE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const RESERVED_WIDGET_ROUTES = new Set([
  "gooddollar",
  "send",
  "receive",
  "swap",
  "predictions",
  "walletconnect",
  "options",
  "promo",
  "qr",
])

const validateWidget = (widget: RegisteredWidget): void => {
  if (!EXACT_PACKAGE_VERSION.test(widget.packageVersion)) {
    throw new Error(
      `Widget ${widget.widgetId} must use an exact package version`,
    )
  }
  if (!ROUTE_SLUG.test(widget.routeSlug)) {
    throw new Error(`Widget ${widget.widgetId} has an invalid route slug`)
  }
  if (RESERVED_WIDGET_ROUTES.has(widget.routeSlug)) {
    throw new Error(
      `Widget ${widget.widgetId} uses a reserved route: ${widget.routeSlug}`,
    )
  }
  if (widget.providerPolicy.chainIds.length === 0) {
    throw new Error(`Widget ${widget.widgetId} requires at least one chain`)
  }
  const unsupportedChains = widget.providerPolicy.chainIds.filter(
    (chainId) => !WIDGET_EVM_CHAIN_IDS.has(chainId),
  )
  if (unsupportedChains.length > 0) {
    throw new Error(
      `Widget ${
        widget.widgetId
      } requests unsupported chains: ${unsupportedChains.join(", ")}`,
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
      `Widget ${
        widget.widgetId
      } requests unsupported methods: ${unsupportedMethods.join(", ")}`,
    )
  }
}

export const createWidgetRegistry = (
  widgets: readonly RegisteredWidget[],
): ReadonlyMap<string, RegisteredWidget> => {
  const registry = new Map<string, RegisteredWidget>()
  const routes = new Set<string>()
  const tags = new Set<string>()

  for (const widget of widgets) {
    validateWidget(widget)
    if (registry.has(widget.widgetId)) {
      throw new Error(`Duplicate widget ID: ${widget.widgetId}`)
    }
    if (routes.has(widget.routeSlug)) {
      throw new Error(`Duplicate widget route: ${widget.routeSlug}`)
    }
    if (widget.integrationMode !== "react" && tags.has(widget.entry.tagName)) {
      throw new Error(
        `Duplicate widget Custom Element tag: ${widget.entry.tagName}`,
      )
    }
    registry.set(widget.widgetId, widget)
    routes.add(widget.routeSlug)
    if (widget.integrationMode !== "react") tags.add(widget.entry.tagName)
  }

  return registry
}

const aiCreditsWidget = defineWidget({
  widgetId: "goodwidget.ai-credits",
  packageName: "@goodwidget/ai-credits-widget",
  packageVersion: "0.1.2",
  routeSlug: "ai-credits",
  displayName: "AI Credits",
  description: "Purchase AI compute credits with your G$ balance",
  dashboardVisible: readBooleanEnv(
    process.env.NEXT_PUBLIC_AI_CREDITS_WIDGET_DASHBOARD_ENABLED,
    false,
  ),
  icon: { kind: "local", render: () => createElement(AiCreditsIcon) },
  integrationMode: "web-component",
  entry: {
    tagName: "ai-credits-widget",
    load: () => import("@goodwidget/ai-credits-widget/register"),
  },
  providerPolicy: {
    chainIds: [CELO_CHAIN_ID],
    requiredMethods: WIDGET_PROVIDER_METHOD_LIST,
  },
  elementProps: {
    backendUrl: process.env.NEXT_PUBLIC_AI_CREDITS_BACKEND_URL,
    fundingVaultAddress:
      process.env.NEXT_PUBLIC_AI_CREDITS_FUNDING_VAULT_ADDRESS,
  },
})

const testFixtureWidget = defineWidget({
  widgetId: "goodwidget.test-fixture",
  packageName: "@goodwidget/test-fixture",
  packageVersion: "0.0.0",
  routeSlug: "test-fixture",
  displayName: "Test Fixture",
  description: "Playwright widget host fixture",
  icon: { kind: "system", name: "Cash" },
  integrationMode: "react",
  entry: {
    exportName: "TestFixtureWidget",
    load: () => import("./fixtures/TestFixtureWidget"),
  },
  providerPolicy: {
    chainIds: [CELO_CHAIN_ID],
    requiredMethods: ["eth_accounts", "eth_chainId"],
  },
})

/**
 * Superfluid Ecosystem Rewards campaign widget.
 *
 * The package registers its Custom Element as a side effect when its register
 * entry is imported.
 */
const superfluidCampaignWidget = defineWidget({
  widgetId: "goodwidget.superfluid-campaign",
  packageName: "@goodwidget/superfluid-campaign-widget",
  packageVersion: "0.1.5",
  routeSlug: "superfluid-campaign",
  displayName: "Superfluid Rewards",
  description: "Earn SUP rewards through GoodDollar and ecosystem actions",
  dashboardVisible: readBooleanEnv(
    process.env.NEXT_PUBLIC_SUPERFLUID_CAMPAIGN_WIDGET_DASHBOARD_ENABLED,
    false,
  ),
  icon: { kind: "system", name: "Cash" },
  integrationMode: "web-component",
  entry: {
    tagName: "gw-superfluid-campaign",
    load: () => import("@goodwidget/superfluid-campaign-widget/register"),
  },
  providerPolicy: {
    chainIds: [CELO_CHAIN_ID, FUSE_CHAIN_ID, XDC_CHAIN_ID, BASE_CHAIN_ID],
    requiredMethods: WIDGET_PROVIDER_METHOD_LIST,
  },
  elementProps: {
    actionLinks: {
      "flow-state-vote": "https://ubi.gd/4yVEYY5",
      "flow-state-funding": "https://ubi.gd/3RNaK8Y",
      "gardens-donation": "https://ubi.gd/4xpmldD",
      "gardens-funding": "https://ubi.gd/457CB6R",
      "invite-users": "https://ubi.gd/4q8oQyw",
      "claim-ubi": "https://ubi.gd/4fGkU4r",
    },
  },
})

const goodReserveWidget = defineWidget({
  widgetId: "goodwidget.goodreserve",
  packageName: "@goodwidget/goodreserve-widget",
  packageVersion: "0.1.5",
  routeSlug: "goodreserve",
  displayName: "GoodReserve",
  description: "Buy and sell G$ through the GoodDollar reserve",
  dashboardVisible: readBooleanEnv(
    process.env.NEXT_PUBLIC_GOODRESERVE_WIDGET_DASHBOARD_ENABLED,
    false,
  ),
  icon: { kind: "system", name: "Cash" },
  integrationMode: "web-component",
  entry: {
    tagName: "gw-goodreserve-widget",
    load: () => import("@goodwidget/goodreserve-widget/register"),
  },
  providerPolicy: {
    chainIds: [CELO_CHAIN_ID, XDC_CHAIN_ID],
    requiredMethods: WIDGET_PROVIDER_METHOD_LIST,
  },
})

export const WIDGETS: readonly RegisteredWidget[] =
  process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE === "true"
    ? [testFixtureWidget]
    : [superfluidCampaignWidget, aiCreditsWidget, goodReserveWidget]
export const widgetRegistry = createWidgetRegistry(WIDGETS)

export const getWidgetByRoute = (
  routeSlug: string,
): RegisteredWidget | undefined =>
  WIDGETS.find((widget) => widget.routeSlug === routeSlug)

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

export const getWidgetDashboardActions = (
  widgets: readonly RegisteredWidget[],
): readonly DashboardAction[] =>
  widgets
    .filter((widget) => widget.dashboardVisible !== false)
    .map(
      (widget): DashboardAction => ({
        id: widget.widgetId,
        widgetId: widget.widgetId,
        routeSlug: widget.routeSlug,
        label: widget.displayName,
        icon: widget.icon,
      }),
    )

export const widgetDashboardActions = getWidgetDashboardActions(WIDGETS)
