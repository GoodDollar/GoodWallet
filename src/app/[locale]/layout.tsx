"use client"
import { useEffect, useState } from "react"

import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import { useSessionContext } from "@/login"
import { DeepLink } from "@/sections/Home/components/DeepLink"
import PrivacyPolicy from "@/sections/Home/components/PrivacyPolicy/PrivacyPolicy"

// Force static generation for this layout
export const dynamic = "force-static"

export default function Layout({
  login,
  home,
}: {
  login: React.ReactNode
  home: React.ReactNode
}) {
  const { signer, isLoading: sessionIsLoading } = useSessionContext()

  const [isFirstMount, setIsFirstMount] = useState(true)
  useEffect(() => setIsFirstMount(false), [])
  const isLoading = isFirstMount || sessionIsLoading

  return (
    <>
      <DeepLink />
      {isLoading ? (
        <div className="h-screen">
          <LoadingSpinner />
        </div>
      ) : signer ? (
        <div key="home">{home}</div>
      ) : (
        <div key="login">{login}</div>
      )}
      <PrivacyPolicy />
    </>
  )
}
