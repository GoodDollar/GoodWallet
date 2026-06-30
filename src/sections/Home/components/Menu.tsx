import { useCallback } from "react"
import Link from "next/link"
import { Button } from "ui"

import { useTranslation } from "translations"
import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"
import { Logo } from "@/components/Typo/Logo"
import { isDeltaMobile } from "@/utils/getClientEnvironment"

import { postMessageToReactNative } from "../../../utils/messageReactNative"

type Props = {
  returnToDelta: () => void
}

const MenuBeforeScroll: React.FC<Props> = ({ returnToDelta }: Props) => {
  const { locale } = useTranslation()
  return (
    <div className="flex justify-between items-center h-[72px] px-4">
      <Link href={`/${locale}/options`} scroll={false} prefetch={true}>
        <Button variant="icon" icon="BsGearFill" size="big" />
      </Link>
      <Logo className="items-center justify-center m-auto" />
      <div className="w-[25px]">
        {isDeltaMobile() ? (
          <Button
            variant="icon"
            icon="BsXLg"
            size="small"
            onClick={returnToDelta}
          />
        ) : null}
      </div>
    </div>
  )
}

export const Menu: React.FC = () => {
  const { captureEvent } = useAnalytics()

  const returnToDelta = useCallback(() => {
    captureEvent({ type: AnalyticsEventTypes.ReturnToDelta })
    postMessageToReactNative({ type: "EXIT_GOODWALLET_APP" })
  }, [captureEvent])

  return <MenuBeforeScroll returnToDelta={returnToDelta} />
}
