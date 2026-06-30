"use client"

import { useState } from "react"
import { Player } from "@lottiefiles/react-lottie-player"
import { useTimeoutEffect } from "@react-hookz/web"

import animationData from "./splash.json"

export default function GoodDollarSplashView({
  children,
}: {
  children: React.ReactNode
}) {
  const [showComponent, setShowComponent] = useState(() => {
    return sessionStorage.getItem("gd-claim-view-seen") === "true"
  })

  // Show animation for 5 seconds on page open
  useTimeoutEffect(() => {
    setShowComponent(true)
    sessionStorage.setItem("gd-claim-view-seen", "true")
  }, 5000)
  if (showComponent) {
    return <>{children}</>
  }
  return (
    <div style={{ height: "100%", overflow: "hidden" }}>
      <Player autoplay src={animationData} className="player " />
    </div>
  )
}
