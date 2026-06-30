"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useSessionContext } from "@/login"

// Key used for storing the deep link URL in local storage
export const DEEP_LINK_URL = "deep_link_url"

export function DeepLink(): null {
  const { signer } = useSessionContext()
  const router = useRouter()

  // Capture URL when not logged in and redirect when logged in
  useEffect(() => {
    // Ensure we're on the client side
    if (typeof window === "undefined") return

    if (!signer) {
      // User is not logged in - save current URL (if it's not a login page)
      const currentPath = window.location.pathname
      const isLoginPage = currentPath.includes("/login")
      const isOptionsPage = currentPath.includes("/options")

      if (isOptionsPage) {
        return
      }

      if (!isLoginPage && currentPath !== "/") {
        // Save the complete URL including query parameters
        const fullUrl =
          window.location.pathname +
          window.location.search +
          window.location.hash
        localStorage.setItem(DEEP_LINK_URL, fullUrl)
      }
    } else {
      // User is logged in - check for saved deep link
      const savedDeepLink = localStorage.getItem(DEEP_LINK_URL)

      if (savedDeepLink) {
        // Clear the saved link before redirecting
        localStorage.removeItem(DEEP_LINK_URL)
        router.push(savedDeepLink)
      }
    }
  }, [signer, router])

  // This component doesn't render anything
  return null
}

export default DeepLink
