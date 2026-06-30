"use client"

import { formatUnits } from "ethers"
import { Box, Text } from "ui"

import { useTranslation } from "translations"
import { formatTokenAmount } from "@/components/Utils/tokenFormat"
import type { User } from "@/gooddollar/stores/inviteStore"

export default function TotalEarnedBox(props: { user: User }) {
  const { totalEarned, bountyAtJoin, bountyPaid } = props.user

  const { translations } = useTranslation()
  const inviteTranslations = translations.invite

  const cumulativeEarned =
    totalEarned + (bountyPaid ? bountyAtJoin / BigInt(2) : BigInt(0))

  const getTotalEarned = () =>
    formatTokenAmount(formatUnits(cumulativeEarned, 18), "G$")

  return (
    <Box vertical elevation="high" align="start">
      <Text style="16-400">{inviteTranslations.totalRewards}</Text>
      <Text style="24-600">{getTotalEarned()}</Text>
    </Box>
  )
}
