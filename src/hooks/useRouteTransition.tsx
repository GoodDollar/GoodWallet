"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"

export const useRouteTransition = (path: string) => {
  const router = useRouter()

  return useCallback(() => router.push(path, { scroll: false }), [path, router])
}
