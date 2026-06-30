"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMountEffect } from "@react-hookz/web"

import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import { INITIALIZE_WALLET_CONNECT_KEY } from "@/sections/WalletConnect/store/walletConnectStore"
import { defaultLocale } from "@/translations"
import { setCloseAfterWCAction, setWCUri } from "@/utils/reownAppKitWrapper"

function Redirect() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useMountEffect(() => {
    const uri = searchParams.get("uri")
    setWCUri(uri)

    const requestId = searchParams.get("requestId")
    const sessionTopic = searchParams.get("sessionTopic")
    if (uri || requestId || sessionTopic) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(INITIALIZE_WALLET_CONNECT_KEY, "true")
      }
      setCloseAfterWCAction(true)
    }
  })

  useEffect(() => {
    //FIXME fix with Locale if logged in before
    router.replace(`/${defaultLocale}`, { scroll: false })
  }, [router])

  return (
    <div className="h-screen">
      <LoadingSpinner />
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Redirect />
    </Suspense>
  )
}
