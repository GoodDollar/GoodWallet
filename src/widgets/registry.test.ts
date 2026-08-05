import { describe, expect, it } from "vitest"

import {
  coreDashboardActions,
  createWidgetRegistry,
  defineWidget,
  WIDGETS,
} from "./registry"

const widget = defineWidget({
  widgetId: "goodwidget.goodreserve",
  packageName: "@goodwidget/goodreserve-widget",
  packageVersion: "1.0.0",
  entry: {
    tagName: "gw-goodreserve-widget",
    load: async () => ({
      goodWidgetMetadata: {
        packageName: "@goodwidget/goodreserve-widget",
        packageVersion: "1.0.0",
      },
      register: (tagName) => tagName ?? "unused",
    }),
  },
  routeSlug: "goodreserve",
  displayName: "GoodReserve",
  description: "Reserve",
  icon: { kind: "system", name: "Cash" },
  providerPolicy: {
    chainIds: [42220],
    requiredMethods: ["eth_accounts", "eth_chainId"],
  },
})

const reactWidget = defineWidget({
  ...widget,
  widgetId: "goodwidget.react",
  routeSlug: "react",
  integrationMode: "react",
  entry: {
    exportName: "GoodReserveWidget",
    load: async () => ({
      goodWidgetMetadata: {
        packageName: "@goodwidget/goodreserve-widget",
        packageVersion: "1.0.0",
      },
      GoodReserveWidget: () => null,
    }),
  },
})

describe("widget registry", () => {
  it("indexes typed widgets by immutable ID", () => {
    expect(createWidgetRegistry([widget]).get(widget.widgetId)).toBe(widget)
  })

  it("accepts web-component and react integration modes", () => {
    expect("integrationMode" in widget).toBe(false)
    expect(reactWidget.integrationMode).toBe("react")
    expect(createWidgetRegistry([widget, reactWidget]).size).toBe(2)
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

  it("registers the Superfluid campaign widget in production", () => {
    expect(WIDGETS).toHaveLength(1)
    expect(WIDGETS[0]).toMatchObject({
      widgetId: "goodwidget.superfluid-campaign",
      packageName: "@goodwidget/superfluid-campaign-widget",
      packageVersion: "0.1.0-beta",
      routeSlug: "superfluid-campaign",
      entry: { tagName: "gw-superfluid-campaign" },
    })
  })
})
