import { describe, expect, it } from "vitest"

import {
  assignHostedWidgetProperties,
  clearHostedWidgetProperties,
} from "./hostProperties"
import type { HostedWidgetElement } from "./hostTypes"
import type { RestrictedEip1193Provider } from "./provider/RestrictedEip1193Provider"

describe("Web Component host properties", () => {
  it("hands objects over by identity and clears Wallet references on cleanup", () => {
    const provider = {} as RestrictedEip1193Provider
    const element = {} as HostedWidgetElement & Record<string, unknown>
    const themeOverrides = { color: { primary: "#00AFFE" } }
    const config = { environment: "production" }
    const elementProps = {
      backendUrl: "https://api.example.com",
      fundingVaultAddress: "0xfundingvault",
    }

    assignHostedWidgetProperties(element, {
      provider,
      themeOverrides,
      config,
      elementProps,
    })

    expect(element.provider).toBe(provider)
    expect(element.themeOverrides).toBe(themeOverrides)
    expect(element.config).toBe(config)
    expect(element.backendUrl).toBe(elementProps.backendUrl)
    expect(element.fundingVaultAddress).toBe(elementProps.fundingVaultAddress)

    clearHostedWidgetProperties(element)

    expect(element.provider).toBeNull()
    expect(element.themeOverrides).toBeUndefined()
    expect(element.config).toBeUndefined()
    expect(element.backendUrl).toBeUndefined()
    expect(element.fundingVaultAddress).toBeUndefined()
  })
})
