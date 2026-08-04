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
    const element = {} as HostedWidgetElement
    const themeOverrides = { color: { primary: "#00AFFE" } }
    const config = { environment: "production" }
    const backendUrl = "https://api.example.com"
    const fundingVaultAddress = "0xfundingvault"

    assignHostedWidgetProperties(element, {
      provider,
      themeOverrides,
      config,
      backendUrl,
      fundingVaultAddress,
    })

    expect(element.provider).toBe(provider)
    expect(element.themeOverrides).toBe(themeOverrides)
    expect(element.config).toBe(config)
    expect(element.backendUrl).toBe(backendUrl)
    expect(element.fundingVaultAddress).toBe(fundingVaultAddress)

    clearHostedWidgetProperties(element)

    expect(element.provider).toBeNull()
    expect(element.themeOverrides).toBeUndefined()
    expect(element.config).toBeUndefined()
    expect(element.backendUrl).toBeUndefined()
    expect(element.fundingVaultAddress).toBeUndefined()
  })
})
