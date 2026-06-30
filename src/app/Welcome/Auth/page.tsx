"use client"

import { useRouter } from "next/navigation"
import { createToast } from "ui"

import { getLocaleOrDefault, localeKey } from "translations"
import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"
import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import { config } from "@/config"
import { useEffectOnce } from "@/hooks/utils"
import { useTorusLogin } from "@/login"

export default function Page() {
  const router = useRouter()
  const { network, web3AuthClientId } = config.torus
  const connect = useTorusLogin(network, web3AuthClientId)
  const { captureEvent } = useAnalytics()

  useEffectOnce(() => {
    const storedLocale = window.sessionStorage.getItem(localeKey)
    const locale = getLocaleOrDefault(storedLocale)

    const goToHome = () => router.push(`/${locale}`, { scroll: false })
    connect()
      .catch((e) => {
        console.error(e)
        captureEvent({
          type: AnalyticsEventTypes.TorusLoginFailed,
        })
        createToast({
          message: `Failed to login. Please try again.`,
          status: "error",
          autoClose: true,
        })
      })
      .finally(goToHome)
  }, [connect])

  return (
    <div className="h-screen flex items-center justify-center">
      <LoadingSpinner />
    </div>
  )
}
