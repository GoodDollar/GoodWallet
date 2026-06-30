"use client"

import { useEffect } from "react"
import { useWindowSize } from "@react-hookz/web"
import { Button } from "ui"
import { useSnapshot } from "valtio"

import { useTranslation } from "translations"
import { CELO_CHAIN_ID } from "@/chain/chain-ids"
import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import WelcomeRewards from "@/components/WelcomeRewards/WelcomeRewards"
import {
  oneTimeRewardStore,
  refresh,
} from "@/gooddollar/stores/oneTimeRewardStore"
import { useRouteTransition } from "@/hooks/useRouteTransition"
import { sessionState } from "@/login/context/SessionContext/storage"
import { isDeltaMobile } from "@/utils/getClientEnvironment"
import { postMessageToReactNative } from "@/utils/messageReactNative"
import { setIsEligibleForWelcomeReward } from "@/utils/welcomeRewardEligibility"

export default function PromoView() {
  const { locale } = useTranslation()
  const gotoRoot = useRouteTransition(`/${locale}`)
  const { height } = useWindowSize()

  const oneTimeReward = useSnapshot(oneTimeRewardStore)[CELO_CHAIN_ID]

  useEffect(() => {
    refresh(CELO_CHAIN_ID, sessionState.addresses?.get("EVM"))
  }, [])

  useEffect(() => {
    if (oneTimeReward.status === "idle") {
      return
    }
    if (
      oneTimeReward.status === "is_active" ||
      oneTimeReward.status === "can_claim"
    ) {
      setIsEligibleForWelcomeReward(true)
    } else {
      gotoRoot()
    }
  }, [oneTimeReward.status, gotoRoot])

  if (
    !(
      oneTimeReward.status === "is_active" ||
      oneTimeReward.status === "can_claim"
    )
  ) {
    return <LoadingSpinner />
  }

  return (
    <div className="flex items-center flex-col" style={{ height }}>
      <div className="cursor-pointer rounded-full fixed right-4 top-4">
        {isDeltaMobile() && (
          <div className="cursor-pointer rounded-full fixed right-4 top-4">
            <Button
              variant="icon"
              icon="BsXLg"
              size="small"
              onClick={() =>
                postMessageToReactNative({ type: "EXIT_GOODWALLET_APP" })
              }
            />
          </div>
        )}
      </div>
      <WelcomeRewards rewardAmount={oneTimeReward.rewardAmount} />
    </div>
  )
}
