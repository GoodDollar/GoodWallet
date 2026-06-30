"use client"

import { useLocalStorageValue, useMountEffect } from "@react-hookz/web"

import { config } from "@/config"

const acceptableLoginMethods = Object.keys(config.enabledLoginOptions).map(
  (key) => key.toLowerCase(),
)
export const useDefaultLoginMethod = () => {
  const defaultLoginMethod = useLocalStorageValue<string>(
    "defaultLoginMethod",
    { defaultValue: "google" },
  )

  useMountEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const loginMethod = searchParams.get("login") ?? undefined
    setDefaultLoginMethod(loginMethod)
  })

  const setDefaultLoginMethod = (newValue?: string) => {
    let transformedValue = newValue?.toLowerCase()
    if (
      transformedValue === "pwdless" ||
      transformedValue === "auth0-pwdless-sms"
    ) {
      transformedValue = "pwless"
    }
    if (transformedValue === "master_seed") {
      transformedValue = "testlogin"
    }
    if (transformedValue && acceptableLoginMethods.includes(transformedValue)) {
      defaultLoginMethod.set(transformedValue)
    }
  }

  return { defaultLoginMethod, setDefaultLoginMethod }
}
