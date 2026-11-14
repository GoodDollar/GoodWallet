import { describe, expect, it } from "vitest"

import { parseWidgetReleaseEnvelope } from "./contract.mjs"

const descriptor = {
  schemaVersion: "2.0.0",
  hostContractVersion: "1.0.0",
  widgetId: "goodwidget.goodreserve",
  packageName: "@goodwidget/goodreserve-widget",
  entries: {
    react: { export: "GoodReserveWidget" },
    webComponent: {
      registerPath: "./register",
      tagName: "gw-goodreserve-widget",
    },
  },
}

const envelope = {
  descriptor,
  version: "1.0.0",
  integrity: `sha512-${"a".repeat(86)}==`,
  sourceSha: "a".repeat(40),
  releaseUrl:
    "https://github.com/GoodDollar/GoodWidget/tree/goodreserve-widget-v1.0.0",
  idempotencyKey: "@goodwidget/goodreserve-widget@1.0.0",
}

describe("GoodWidget release contract", () => {
  it("accepts a minimal schema 2 descriptor and release envelope", () => {
    expect(parseWidgetReleaseEnvelope(envelope).descriptor.widgetId).toBe(
      "goodwidget.goodreserve",
    )
  })

  it("rejects fields outside the closed descriptor", () => {
    expect(() =>
      parseWidgetReleaseEnvelope({
        ...envelope,
        descriptor: { ...descriptor, selectors: {} },
      }),
    ).toThrow()
  })

  it("rejects prereleases, arbitrary entry paths, and mismatched idempotency", () => {
    expect(() =>
      parseWidgetReleaseEnvelope({
        ...envelope,
        version: "1.0.0-beta.1",
        idempotencyKey: "@goodwidget/goodreserve-widget@1.0.0-beta.1",
      }),
    ).toThrow()
    expect(() =>
      parseWidgetReleaseEnvelope({
        ...envelope,
        descriptor: {
          ...descriptor,
          entries: {
            ...descriptor.entries,
            webComponent: {
              ...descriptor.entries.webComponent,
              registerPath: "./internal/register",
            },
          },
        },
      }),
    ).toThrow()
    expect(() =>
      parseWidgetReleaseEnvelope({
        ...envelope,
        idempotencyKey: "@goodwidget/other-widget@1.0.0",
      }),
    ).toThrow()
    expect(() =>
      parseWidgetReleaseEnvelope({
        ...envelope,
        releaseUrl: "http://example.com/release",
      }),
    ).toThrow()
  })
})
