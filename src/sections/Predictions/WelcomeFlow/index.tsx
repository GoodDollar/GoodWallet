import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import useGeoblock from "../hooks/useGeoblock"
import { useTrading } from "../providers/TradingProvider"
import BlockedModal from "./components/BlockedModal"
import CreateAccountModal from "./components/CreateAccountModal"

export default function WelcomeFlow() {
  const [shouldShowBlockedModal, setShouldShowBlockedModal] = useState(false)
  const [shouldShowCreateAccountModal, setShouldShowCreateAccountModal] =
    useState(false)
  const { tradingSession } = useTrading()
  const router = useRouter()
  const { isBlocked: isGeoblocked } = useGeoblock()

  useEffect(() => {
    if (isGeoblocked) {
      setShouldShowBlockedModal(true)
      return
    }

    if (!tradingSession?.hasApprovals) {
      setShouldShowCreateAccountModal(true)
      return
    }
  }, [tradingSession, isGeoblocked])

  const onClose = () => {
    router.push("/")
  }

  const onComplete = () => {
    setShouldShowCreateAccountModal(false)
  }

  return (
    <>
      {shouldShowBlockedModal ? (
        <>
          <BlockedModal onClose={onClose} />
        </>
      ) : (
        <>
          {shouldShowCreateAccountModal && (
            <CreateAccountModal onComplete={onComplete} />
          )}
        </>
      )}
    </>
  )
}
