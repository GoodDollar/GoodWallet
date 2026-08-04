import { describe, expect, it } from "vitest"

import {
  coreDashboardActions,
  createWidgetRegistry,
  DEFAULT_WIDGET_INTEGRATION_MODE,
  defineWidget,
  resolveWidgetIntegrationMode,
} from "./registry"

const widget = defineWidget({
  widgetId: "goodwidget.goodreserve",
  packageName: "@goodwidget/goodreserve-widget",
  packageVersion: "1.0.0",
  // Generated integration PRs use literal imports here so the bundler can
  // discover both choices before a maintainer selects one.
  entries: {
    react: {
      exportName: "GoodReserveWidget",
      load: async () => ({ GoodReserveWidget: () => null }),
    },
    webComponent: {
      tagName: "gw-goodreserve-widget",
      load: async () => ({ register: (tagName) => tagName ?? "unused" }),
    },
  },
  routeSlug: "goodreserve",
  displayName: "GoodReserve",
  description: "Reserve",
  icon: { kind: "system", name: "Cash" },
  // Provider permissions are deliberately selected and reviewed in GoodWallet.
  providerPolicy: {
    chainIds: [1, 42220],
    requiredMethods: ["eth_accounts"],
  },
})

describe("widget registry", () => {
  it("indexes typed widgets by immutable ID", () => {
    expect(createWidgetRegistry([widget]).get(widget.widgetId)).toBe(widget)
  })

  it("defaults to Web Components and permits a reviewed React override", () => {
    expect(DEFAULT_WIDGET_INTEGRATION_MODE).toBe("web-component")
    expect(resolveWidgetIntegrationMode(widget)).toBe("web-component")
    expect(
      resolveWidgetIntegrationMode({ ...widget, integrationMode: "react" }),
    ).toBe("react")
  })

  it("rejects duplicate IDs and routes", () => {
    expect(() => createWidgetRegistry([widget, widget])).toThrow(
      "Duplicate widget ID",
    )
    expect(() =>
      createWidgetRegistry([
        widget,
        { ...widget, widgetId: "goodwidget.other" },
      ]),
    ).toThrow("Duplicate widget route")
  })

  it("preserves the reviewed core icon order before widget actions", () => {
    expect(coreDashboardActions.map(({ id }) => id)).toEqual([
      "gooddollar",
      "send",
      "receive",
      "swap",
      "predictions",
      "walletconnect",
    ])
    expect(
      coreDashboardActions.every(({ placement }) => placement === "primary"),
    ).toBe(true)
  })
})
