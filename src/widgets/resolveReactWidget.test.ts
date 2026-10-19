import { describe, expect, it } from "vitest"

import { assertWidgetModuleMetadata } from "./hostTypes"
import { resolveReactWidget } from "./resolveReactWidget"

describe("React widget export resolution", () => {
  it("returns the exact declared component export", () => {
    const GoodReserveWidget = () => null

    expect(resolveReactWidget({ GoodReserveWidget }, "GoodReserveWidget")).toBe(
      GoodReserveWidget,
    )
  })

  it("accepts memoized and forwarded React component objects", () => {
    const MemoWidget = {
      $$typeof: Symbol.for("react.memo"),
      type: () => null,
    }
    const ForwardWidget = {
      $$typeof: Symbol.for("react.forward_ref"),
      render: () => null,
    }

    expect(resolveReactWidget({ MemoWidget }, "MemoWidget")).toBe(MemoWidget)
    expect(resolveReactWidget({ ForwardWidget }, "ForwardWidget")).toBe(
      ForwardWidget,
    )
  })

  it("rejects a missing or non-component export", () => {
    expect(() => resolveReactWidget({}, "MissingWidget")).toThrow(
      "does not export React component MissingWidget",
    )
    expect(() =>
      resolveReactWidget(
        { GoodReserveWidget: "not-a-component" },
        "GoodReserveWidget",
      ),
    ).toThrow("does not export React component GoodReserveWidget")
  })

  it("rejects module metadata whose package name does not match the registry", () => {
    expect(() =>
      assertWidgetModuleMetadata(
        {
          goodWidgetMetadata: {
            packageName: "@goodwidget/other-widget",
            packageVersion: "1.0.0",
          },
        },
        "@goodwidget/react-widget",
      ),
    ).toThrow("expected @goodwidget/react-widget")
  })

  it("allows a version mismatch when the package name matches", () => {
    expect(() =>
      assertWidgetModuleMetadata(
        {
          goodWidgetMetadata: {
            packageName: "@goodwidget/react-widget",
            packageVersion: "2.0.0",
          },
        },
        "@goodwidget/react-widget",
      ),
    ).not.toThrow()
  })
})
