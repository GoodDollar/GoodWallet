import { describe, expect, it } from "vitest"

import { resolveReactWidget } from "./resolveReactWidget"

describe("React widget export resolution", () => {
  it("returns the exact declared component export", () => {
    const GoodReserveWidget = () => null

    expect(resolveReactWidget({ GoodReserveWidget }, "GoodReserveWidget")).toBe(
      GoodReserveWidget,
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
})
