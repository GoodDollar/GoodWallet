"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMountEffect } from "@react-hookz/web"

import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import { inviteCodeStore } from "@/gooddollar/stores/inviteCodeStore"

import { useLocaleFromQueryParams } from "./useLocaleFromQueryParams"

function Redirect() {
  const router = useRouter()
  const { locale } = useLocaleFromQueryParams()
  const searchParams = useSearchParams()

  useMountEffect(() => {
    const inviteCode = searchParams.get("inviteCode")
    if (inviteCode) {
      inviteCodeStore.inviteCode = inviteCode
    }
  })

  // Redirect to locale (from query params, or default)
  useEffect(() => {
    router.replace(`/${locale}?${searchParams}`, { scroll: false })
  }, [searchParams, locale, router])

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
