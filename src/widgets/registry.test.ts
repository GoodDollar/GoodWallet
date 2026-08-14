import { describe, expect, it } from "vitest"

import { WIDGET_PROVIDER_METHOD_LIST } from "./provider/policy"
import {
  coreDashboardActions,
  createWidgetRegistry,
  defineWidget,
  getWidgetDashboardActions,
  WIDGETS,
  widgetDashboardActions,
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

  it("keeps hidden widget routes available while omitting their dashboard actions", () => {
    const hiddenWidget = defineWidget({
      ...widget,
      widgetId: "goodwidget.hidden",
      routeSlug: "hidden",
      dashboardVisible: false,
    })

    const actions = getWidgetDashboardActions([widget, hiddenWidget])

    expect(actions.map(({ routeSlug }) => routeSlug)).toEqual(["goodreserve"])
    expect(createWidgetRegistry([hiddenWidget]).get("goodwidget.hidden")).toBe(
      hiddenWidget,
    )
  })

  it("registers the Superfluid campaign widget in production", () => {
    const superfluid = WIDGETS.find(
      (widget) => widget.widgetId === "goodwidget.superfluid-campaign",
    )
    expect(superfluid).toBeDefined()
    expect(superfluid).toMatchObject({
      widgetId: "goodwidget.superfluid-campaign",
      packageName: "@goodwidget/superfluid-campaign-widget",
      packageVersion: "0.1.5",
      routeSlug: "superfluid-campaign",
      entry: { tagName: "gw-superfluid-campaign" },
      providerPolicy: {
        chainIds: [42220, 122, 50, 8453],
      },
    })
    const action = widgetDashboardActions.find(
      (dashboardAction) =>
        dashboardAction.widgetId === "goodwidget.superfluid-campaign",
    )
    if (superfluid?.dashboardVisible === false) {
      expect(action).toBeUndefined()
    } else {
      expect(action).toBeDefined()
      expect(action?.routeSlug).toBe("superfluid-campaign")
    }
  })

  describe("AI Credits widget", () => {
    it("is present in the live WIDGETS array with the correct widgetId", () => {
      const aiCredits = WIDGETS.find(
        (w) => w.widgetId === "goodwidget.ai-credits",
      )
      expect(aiCredits).toBeDefined()
      expect(aiCredits?.routeSlug).toBe("ai-credits")
      expect(aiCredits?.packageName).toBe("@goodwidget/ai-credits-widget")
    })

    it("passes registry validation (createWidgetRegistry does not throw)", () => {
      const aiCredits = WIDGETS.find(
        (w) => w.widgetId === "goodwidget.ai-credits",
      )
      expect(aiCredits).toBeDefined()
      if (!aiCredits) return
      expect(() => createWidgetRegistry([aiCredits])).not.toThrow()
    })

    it("appears in widgetDashboardActions", () => {
      const aiCredits = WIDGETS.find(
        (w) => w.widgetId === "goodwidget.ai-credits",
      )
      const action = widgetDashboardActions.find(
        (a) => a.widgetId === "goodwidget.ai-credits",
      )
      if (aiCredits?.dashboardVisible === false) {
        expect(action).toBeUndefined()
      } else {
        expect(action).toBeDefined()
        expect(action?.routeSlug).toBe("ai-credits")
        expect(action?.label).toBe("AI Credits")
      }
    })

    it("uses the shared provider method allowlist", () => {
      const aiCredits = WIDGETS.find(
        (w) => w.widgetId === "goodwidget.ai-credits",
      )
      expect(aiCredits?.providerPolicy.requiredMethods).toEqual([
        ...WIDGET_PROVIDER_METHOD_LIST,
      ])
    })
  })

  describe("GoodReserve widget", () => {
    it("is present in the live WIDGETS array with the correct widgetId", () => {
      const goodReserve = WIDGETS.find(
        (w) => w.widgetId === "goodwidget.goodreserve",
      )
      expect(goodReserve).toBeDefined()
      expect(goodReserve).toMatchObject({
        widgetId: "goodwidget.goodreserve",
        packageName: "@goodwidget/goodreserve-widget",
        packageVersion: "0.1.3",
        routeSlug: "goodreserve",
        entry: { tagName: "gw-goodreserve-widget" },
        providerPolicy: {
          chainIds: [42220, 50],
        },
      })
    })

    it("passes registry validation (createWidgetRegistry does not throw)", () => {
      const goodReserve = WIDGETS.find(
        (w) => w.widgetId === "goodwidget.goodreserve",
      )
      expect(goodReserve).toBeDefined()
      if (!goodReserve) return
      expect(() => createWidgetRegistry([goodReserve])).not.toThrow()
    })

    it("appears in widgetDashboardActions only when dashboardVisible", () => {
      const goodReserve = WIDGETS.find(
        (w) => w.widgetId === "goodwidget.goodreserve",
      )
      const action = widgetDashboardActions.find(
        (a) => a.widgetId === "goodwidget.goodreserve",
      )
      if (goodReserve?.dashboardVisible === false) {
        expect(action).toBeUndefined()
      } else {
        expect(action).toBeDefined()
        expect(action?.routeSlug).toBe("goodreserve")
        expect(action?.label).toBe("GoodReserve")
      }
    })

    it("uses the shared provider method allowlist", () => {
      const goodReserve = WIDGETS.find(
        (w) => w.widgetId === "goodwidget.goodreserve",
      )
      expect(goodReserve?.providerPolicy.requiredMethods).toEqual([
        ...WIDGET_PROVIDER_METHOD_LIST,
      ])
    })
  })
})
