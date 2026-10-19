import { describe, expect, it } from "vitest"

import { ReactWidgetHost } from "./hosts/ReactWidgetHost"
import { WebComponentWidgetHost } from "./hosts/WebComponentWidgetHost"
import type { RestrictedEip1193Provider } from "./provider/RestrictedEip1193Provider"
import { defineWidget } from "./registry"
import { WidgetRenderer } from "./WidgetRenderer"

const webComponentWidget = defineWidget({
  widgetId: "goodwidget.web-component",
  packageName: "@goodwidget/web-component",
  packageVersion: "1.0.0",
  routeSlug: "web-component",
  displayName: "Web Component",
  description: "Web Component test widget",
  icon: { kind: "system", name: "Cash" },
  entry: {
    tagName: "gw-test-widget",
    load: async () => ({
      goodWidgetMetadata: {
        packageName: "@goodwidget/web-component",
        packageVersion: "1.0.0",
      },
      register: (tagName) => tagName ?? "gw-test-widget",
    }),
  },
  providerPolicy: {
    chainIds: [42220],
    requiredMethods: ["eth_accounts"],
  },
})

const reactWidget = defineWidget({
  widgetId: "goodwidget.react",
  packageName: "@goodwidget/react",
  packageVersion: "1.0.0",
  routeSlug: "react",
  displayName: "React",
  description: "React test widget",
  icon: { kind: "system", name: "Cash" },
  integrationMode: "react",
  entry: {
    exportName: "TestWidget",
    load: async () => ({
      goodWidgetMetadata: {
        packageName: "@goodwidget/react",
        packageVersion: "1.0.0",
      },
      TestWidget: () => null,
    }),
  },
  providerPolicy: {
    chainIds: [42220],
    requiredMethods: ["eth_accounts"],
  },
})

const provider = {} as RestrictedEip1193Provider

describe("WidgetRenderer", () => {
  it("uses the Web Component host when integrationMode is omitted", () => {
    const element = WidgetRenderer({
      widget: webComponentWidget,
      provider,
    })

    expect(element.type).toBe(WebComponentWidgetHost)
    expect(element.props).toMatchObject({
      load: webComponentWidget.entry.load,
      tagName: "gw-test-widget",
      packageName: "@goodwidget/web-component",
      packageVersion: "1.0.0",
      provider,
    })
  })

  it("uses the React host only when a widget explicitly selects it", () => {
    const element = WidgetRenderer({ widget: reactWidget, provider })

    expect(element.type).toBe(ReactWidgetHost)
    expect(element.props).toMatchObject({
      load: reactWidget.entry.load,
      exportName: "TestWidget",
      packageName: "@goodwidget/react",
      packageVersion: "1.0.0",
      provider,
    })
  })
})
