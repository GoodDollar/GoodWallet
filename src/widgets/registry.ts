import type { ReactNode } from "react"
import type { IconName } from "ui"

import { CELO_CHAIN_ID } from "@/chain/chain-ids"

import { AiCreditsIcon } from "./icons/AiCreditsIcon"

import type { ReactWidgetLoader, WebComponentWidgetLoader } from "./hostTypes"
import {
  WIDGET_EVM_CHAIN_IDS,
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

/**
 * AI Credits widget – allows authenticated users to purchase AI compute credits
 * directly from the wallet dashboard using their G$ balance.
 *
 * Integration mode: web-component (Custom Element `ai-credits-widget`).
 * Required EIP-1193 methods: eth_accounts, eth_chainId, eth_getBalance, eth_call,
 *   eth_sendTransaction (for purchases).
 */
const aiCreditsWidget = defineWidget({
  widgetId: "goodwidget.ai-credits",
  packageName: "@goodwidget/ai-credits-widget",
  packageVersion: "0.1.0",
  routeSlug: "ai-credits",
  displayName: "AI Credits",
  description: "Purchase AI compute credits with your G$ balance",
  icon: { kind: "local", render: () => <AiCreditsIcon /> },
  integrationMode: "web-component",
  entry: {
    tagName: "ai-credits-widget",
    load: () => import("@goodwidget/ai-credits-widget/register"),
  },
  providerPolicy: {
    chainIds: [CELO_CHAIN_ID],
    // eth_getBalance and eth_call are needed for balance checks and contract reads;
    // eth_sendTransaction is required to submit credit-purchase transactions.
    requiredMethods: [
      "eth_accounts",
      "eth_chainId",
      "eth_getBalance",
      "eth_call",
      "eth_sendTransaction",
    ],
  },
})


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

export const WIDGETS: readonly RegisteredWidget[] =
  process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE === "true"
    ? [testFixtureWidget]
    : [aiCreditsWidget]
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

export const widgetDashboardActions = WIDGETS.map(
  (widget): DashboardAction => ({
    id: widget.widgetId,
    widgetId: widget.widgetId,
    routeSlug: widget.routeSlug,
    label: widget.displayName,
    icon: widget.icon,
  }),
)
