"use client"

import { useDefaultLoginMethod } from "@/sections/Login/useDefaultLoginMethod"

// Force static generation for this layout
export const dynamic = "force-static"

export default function Layout({ children }: { children: React.ReactNode }) {
  useDefaultLoginMethod()
  return children
}
