import { describe, expect, it } from "vitest"

import {
  assignHostedWidgetProperties,
  clearHostedWidgetProperties,
} from "./hostProperties"
import type { HostedWidgetElement } from "./hostTypes"
import type { RestrictedEip1193Provider } from "./provider/RestrictedEip1193Provider"

describe("Web Component host properties", () => {
  it("passes the provider by identity and clears every Wallet-owned reference", () => {
    const provider = {} as RestrictedEip1193Provider
    const element = {} as HostedWidgetElement
    const themeOverrides = { color: { primary: "#00AFFE" } }
    const config = { environment: "production" }

    assignHostedWidgetProperties(element, {
      provider,
      themeOverrides,
      config,
    })

    expect(element.provider).toBe(provider)
    expect(element.themeOverrides).toBe(themeOverrides)
    expect(element.config).toBe(config)

    clearHostedWidgetProperties(element)

    expect(element.provider).toBeNull()
    expect(element.themeOverrides).toBeUndefined()
    expect(element.config).toBeUndefined()
  })
})
