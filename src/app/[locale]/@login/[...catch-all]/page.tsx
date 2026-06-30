"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useTranslation } from "translations"
import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"

export default function Page() {
  const router = useRouter()
  const { locale } = useTranslation()

  useEffect(() => {
    router.replace(`/${locale}`)
  }, [router, locale])

  return (
    <div className="h-screen">
      <LoadingSpinner />
    </div>
  )
}
