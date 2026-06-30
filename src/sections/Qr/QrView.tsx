"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { useTranslation } from "translations"
import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"
import QrScanner from "@/components/QrScanner/QrScanner"
import { setBottomSheetProps } from "@/components/Snippet/BottomSheet/bottomSheetStore"

export default function QrView() {
  setBottomSheetProps({ title: "QR Code Scanner" })

  const { locale } = useTranslation()
  const router = useRouter()
  const { captureEvent } = useAnalytics()
  const [URI, setURI] = useState<string | null>(null)

  function genSendURI(ethQRLink: string) {
    const appSendLink = `/${locale}/send?to=`
    return ethQRLink.replace("ethereum:", appSendLink)
  }

  const onScan = (result: string) => {
    const sendURI = genSendURI(result)
    captureEvent({
      type: AnalyticsEventTypes.ReceiveQRCodeScanned,
      data: result,
    })
    setURI(sendURI)
  }

  // This is set to clear QR BottomSheet before
  // re-opening send Bottomsheet
  useEffect(() => {
    if (URI !== null) {
      router.push(URI, { scroll: false })
      setURI(null)
    }
  }, [URI, router])

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <QrScanner onScan={onScan} openCamera={true} />
    </div>
  )
}
