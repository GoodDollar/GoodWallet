"use client"

import type { Balances } from "@/hooks/useTokenBalances/fetchers/balances"
import type { Addresses } from "@/login"
import { trackingPreferences } from "@/stores/trackingPreferencesStore"
import type { Tokens } from "@/tokens/types"

import type { AnalyticsEvent } from "./types"

export const identifyUser = async (addresses: Addresses) => {
  if (trackingPreferences.Amplitude === "denied") return
  const userId = addresses.get("EVM")
  if (!userId) return
  const { setUserId, Identify, identify } = await import(
    "@amplitude/analytics-browser"
  )
  setUserId(userId)

  const identifyUser = new Identify()
  for (const [key, value] of addresses) {
    identifyUser.set("ADDR_" + key, value)
  }
  identify(identifyUser)
}

export const captureEvent = async (event: AnalyticsEvent) => {
  if (trackingPreferences.Amplitude === "denied") return

  const { track } = await import("@amplitude/analytics-browser")
  const { type, ...rest } = event
  track(type, { ...rest })
}

export const updateNetWorth = async (balances: Balances, tokens: Tokens) => {
  if (trackingPreferences.Amplitude === "denied") return

  const { Identify, identify } = await import("@amplitude/analytics-browser")
  const amplitudeIdentifier = new Identify()
  amplitudeIdentifier.set("valueUsd", Number(balances.aggregatedUsdValue))
  const assets = balances.byUsdValue.map((balance) => ({
    chainId: balance.chainId,
    address: balance.address,
    symbol: tokens.get(balance.chainId)?.get(balance.address)?.symbol ?? "NA",
    amount: Number(balance.amount),
    usdValue: balance.hasValue ? Number(balance.usdValue) : 0,
  }))

  amplitudeIdentifier.set("assets", assets)
  identify(amplitudeIdentifier)
}

export const logout = async () => {
  if (trackingPreferences.Amplitude === "denied") return
  const { reset } = await import("@amplitude/analytics-browser")
  reset()
}

export function useAnalytics() {
  return { identifyUser, captureEvent, updateNetWorth, logout }
}
