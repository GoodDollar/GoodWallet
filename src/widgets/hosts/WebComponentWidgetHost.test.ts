import { afterEach, describe, expect, it, vi } from "vitest"

import { registerElement } from "./WebComponentWidgetHost"

describe("Custom Element registration", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("registers a tag once and rejects a different loader for the same tag", async () => {
    const define = vi.fn()
    const get = vi.fn<() => CustomElementConstructor | undefined>(
      () => undefined,
    )
    vi.stubGlobal("customElements", { define, get })

    const firstLoad = vi.fn(async () => ({
      goodWidgetMetadata: {
        packageName: "@goodwidget/test-widget",
        packageVersion: "1.0.0",
      },
      register: async (tagName?: string) => {
        get.mockReturnValue(class {} as CustomElementConstructor)
        return tagName ?? "gw-widget"
      },
    }))
    const secondLoad = vi.fn(async () => ({
      goodWidgetMetadata: {
        packageName: "@goodwidget/test-widget",
        packageVersion: "1.0.0",
      },
      register: async (tagName?: string) => tagName ?? "gw-widget",
    }))

    await expect(
      registerElement(
        firstLoad,
        "gw-widget",
        "@goodwidget/test-widget",
        "1.0.0",
      ),
    ).resolves.toBe("gw-widget")
    await expect(
      registerElement(
        firstLoad,
        "gw-widget",
        "@goodwidget/test-widget",
        "1.0.0",
      ),
    ).resolves.toBe("gw-widget")
    expect(firstLoad).toHaveBeenCalledTimes(1)
    await expect(
      registerElement(
        secondLoad,
        "gw-widget",
        "@goodwidget/test-widget",
        "1.0.0",
      ),
    ).rejects.toThrow("already registered")
  })

  it("rejects module metadata that does not match the registry", async () => {
    const get = vi.fn(() => undefined)
    vi.stubGlobal("customElements", { define: vi.fn(), get })
    const load = vi.fn(async () => ({
      goodWidgetMetadata: {
        packageName: "@goodwidget/test-widget",
        packageVersion: "2.0.0",
      },
      register: async (tagName?: string) => tagName ?? "gw-versioned-widget",
    }))

    await expect(
      registerElement(
        load,
        "gw-versioned-widget",
        "@goodwidget/test-widget",
        "1.0.0",
      ),
    ).rejects.toThrow("expected @goodwidget/test-widget@1.0.0")
  })
})
