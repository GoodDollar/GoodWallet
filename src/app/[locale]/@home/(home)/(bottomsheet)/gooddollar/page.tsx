import { Suspense } from "react"

import GoodDollarSplashView from "@/sections/GoodDollar/GoodDollarSplashView"
import GoodDollarView from "@/sections/GoodDollar/GoodDollarView"

export default function Page() {
  return (
    <GoodDollarSplashView>
      <Suspense fallback={null}>
        <GoodDollarView />
      </Suspense>
    </GoodDollarSplashView>
  )
}
