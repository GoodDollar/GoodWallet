import { afterEach, describe, expect, it, vi } from "vitest"

import { registerElement } from "./WebComponentWidgetHost"

describe("Custom Element registration", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("registers a tag once and rejects a different loader for the same tag", async () => {
    const define = vi.fn()
    const get = vi.fn(() => undefined)
    vi.stubGlobal("customElements", { define, get })

    const firstLoad = vi.fn(async () => ({
      register: async (tagName?: string) => {
        get.mockReturnValue(class {} as CustomElementConstructor)
        return tagName ?? "gw-widget"
      },
    }))
    const secondLoad = vi.fn(async () => ({
      register: async (tagName?: string) => tagName ?? "gw-widget",
    }))

    await expect(registerElement(firstLoad, "gw-widget")).resolves.toBe(
      "gw-widget",
    )
    await expect(registerElement(firstLoad, "gw-widget")).resolves.toBe(
      "gw-widget",
    )
    expect(firstLoad).toHaveBeenCalledTimes(1)
    await expect(registerElement(secondLoad, "gw-widget")).rejects.toThrow(
      "already registered",
    )
  })
})
