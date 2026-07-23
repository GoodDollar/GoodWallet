import { Text } from "ui"

import { useTranslation } from "translations"
import { formatTokenAmount } from "@/components/Utils/tokenFormat"

import styles from "./Claim.module.css"

type DailyClaimStats = {
  dailyNumberOfClaimers: number
  dailyClaimedAmount: number
  dailyTotalAmount: number
}

type ClaimFooterProps = {
  dailyStats: DailyClaimStats
}

export const ClaimFooter = ({ dailyStats }: ClaimFooterProps) => {
  const { translations } = useTranslation()
  const goodDollarTranslations = translations.gooddollar

  return (
    <div className={styles.footer}>
      <Text style="14-400" color="text-secondary" align="center">
        {goodDollarTranslations.today}
      </Text>

      <Text style="14-400" color="text-secondary" align="center" el="div">
        <Text style="14-600" color="text-soft" translate="no">
          {formatTokenAmount(dailyStats.dailyNumberOfClaimers)}
        </Text>{" "}
        {goodDollarTranslations.claimersReceived}{" "}
        <Text style="14-600" color="text-soft" translate="no">
          {formatTokenAmount(dailyStats.dailyClaimedAmount, "G$")}
        </Text>
      </Text>

      <Text style="14-400" color="text-secondary" align="center" el="div">
        {goodDollarTranslations.outOf}{" "}
        <Text style="14-600" color="text-soft" translate="no">
          {formatTokenAmount(dailyStats.dailyTotalAmount, "G$")}
        </Text>{" "}
        {goodDollarTranslations.available}
      </Text>
    </div>
  )
}
