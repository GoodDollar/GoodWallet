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
  providerPolicy: {
    chainIds: [1, 42220],
    requiredMethods: ["eth_accounts", "eth_chainId"],
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

  it("rejects non-exact package versions and unsupported policy entries", () => {
    expect(() =>
      createWidgetRegistry([{ ...widget, packageVersion: "^1.0.0" } as never]),
    ).toThrow("exact package version")
    expect(() =>
      createWidgetRegistry([
        {
          ...widget,
          providerPolicy: { ...widget.providerPolicy, chainIds: [999] },
        } as never,
      ]),
    ).toThrow("unsupported chains")
    expect(() =>
      createWidgetRegistry([
        {
          ...widget,
          providerPolicy: {
            ...widget.providerPolicy,
            requiredMethods: ["wallet_getSeed"],
          },
        } as never,
      ]),
    ).toThrow("unsupported methods")
  })

  it("rejects reserved routes, empty chains, and duplicate Custom Element tags", () => {
    expect(() =>
      createWidgetRegistry([{ ...widget, routeSlug: "send" }]),
    ).toThrow("reserved route")
    expect(() =>
      createWidgetRegistry([
        {
          ...widget,
          providerPolicy: { ...widget.providerPolicy, chainIds: [] },
        },
      ]),
    ).toThrow("at least one chain")
    expect(() =>
      createWidgetRegistry([
        widget,
        {
          ...widget,
          widgetId: "goodwidget.other",
          routeSlug: "other",
        },
      ]),
    ).toThrow("Duplicate widget Custom Element tag")
  })

  it("keeps the six reviewed core actions ahead of widget actions", () => {
    expect(coreDashboardActions.map(({ id }) => id)).toEqual([
      "gooddollar",
      "send",
      "receive",
      "swap",
      "predictions",
      "walletconnect",
    ])
  })
})
