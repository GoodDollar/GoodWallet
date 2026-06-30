"use client"

import { setBottomSheetProps } from "@/components/Snippet/BottomSheet/bottomSheetStore"
import { Fallback } from "@/components/Snippet/Fallback"
import { useTokenBalances } from "@/hooks/useTokenBalances"
import { useTranslation } from "@/translations"

import { SendAmount } from "./components/SendAmount"
import { SendRecipient } from "./components/SendRecipient"
import { SendReview } from "./components/SendReview"
import styles from "./SendView.module.css"

export default function SendView() {
  const sendTranslations = useTranslation().translations.send
  const { tokens, balances, isLoading } = useTokenBalances()

  setBottomSheetProps({
    title: sendTranslations.title,
  })

  if (isLoading) return <Fallback showLoading={true} />
  if (!tokens || !balances?.byChain)
    return <Fallback showText={sendTranslations.noTokens} />

  return (
    <div className={styles.container}>
      <SendAmount />
      <SendRecipient />
      <SendReview />
    </div>
  )
}
