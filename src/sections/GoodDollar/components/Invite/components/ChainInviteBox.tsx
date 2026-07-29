"use client"

import React from "react"
import Image from "next/image"
import { formatUnits } from "ethers"
import { Box, Button, Text } from "ui"

import { useTranslation } from "translations"
import { AnalyticsEventTypes } from "@/analytics/types"
import { captureEvent } from "@/analytics/useAnalytics"
import { getChainName } from "@/chain/chains"
import { getChainIcon } from "@/components/Typo/ChainIcon"
import { formatTokenAmount } from "@/components/Utils/tokenFormat"
import { type EncodedMethod, estimateTypeAndFees, sendTx } from "@/ethers-utils"
import { refreshInviteStore, type User } from "@/gooddollar/stores/inviteStore"
import { getTx } from "@/gooddollar/stores/utils"
import { sessionState } from "@/login/context/SessionContext/storage"
import { createNotification } from "@/ui/notifications/notificationStore"
import { canShare } from "@/utils/share"

import styles from "../InviteView.module.css"

export default function ChainInviteBox(props: {
  user: User
  isWhitelisted: boolean
  chainId: number
  bountyAmount: bigint
  getJoinCallData: (inviteCode: string | null) => Promise<EncodedMethod>
}) {
  const { user, chainId, bountyAmount, isWhitelisted, getJoinCallData } = props
  const [isJoining, setIsJoining] = React.useState(false)
  const hasInviteCode = user.inviteCode.length > 0

  const { translations } = useTranslation()
  const inviteTranslations = translations.invite

  const inviteLink = hasInviteCode
    ? `https://${typeof window !== "undefined" ? window.location.host : ""}?inviteCode=${user.inviteCode}&chainId=${chainId}`
    : ""

  const formattedReward = formatTokenAmount(formatUnits(bountyAmount, 18), "G$")

  const chainName = getChainName(chainId)
  const chainIcon = getChainIcon(chainId)

  const handleJoin = async () => {
    if (isJoining) return

    setIsJoining(true)
    try {
      const signer = sessionState.session?.signer.EVM
      if (!signer) {
        throw new Error("No signer found")
      }

      const callData = await getJoinCallData(null)
      const { gasLimit, ...broadCastRequest } = await getTx(
        chainId,
        signer.address,
        callData,
      )
      const broadcastOptions = await estimateTypeAndFees(chainId)
      await sendTx(signer, gasLimit, broadCastRequest, broadcastOptions)

      captureEvent({
        type: AnalyticsEventTypes.GoodDollarInviteJoinSucceeded,
        chainId: chainId,
        rewardAmount: Number(bountyAmount),
      })
      refreshInviteStore()
      createNotification({
        status: "success",
        autoClose: true,
        message: `Joined Successfully on ${chainName}`,
      })
    } catch (error) {
      console.error(error)
      createNotification({
        status: "error",
        autoClose: true,
        message: `Failed to join on ${chainName}`,
      })
      captureEvent({
        type: AnalyticsEventTypes.GoodDollarInviteJoinFailed,
        chainId: chainId,
        reason: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsJoining(false)
    }
  }
  return (
    <Box vertical padding="large" elevation="high" align="start">
      <div className={styles.chainInviteBox}>
        <Image
          src={chainIcon}
          alt={chainName}
          width={24}
          height={24}
          style={{ borderRadius: "50%" }}
        />
        {hasInviteCode ? (
          <>
            <div className={styles.chainInviteBoxHeader}>
              <Text style="14-400" translate="no">
                {formattedReward}
              </Text>
            </div>
            <div className={styles.chainInviteBoxActions}>
              {hasInviteCode && (
                <Box gap="small" width="content">
                  {canShare(inviteLink) && (
                    <Button
                      variant="pill"
                      text="Share"
                      onClick={() => navigator.share({ text: inviteLink })}
                    />
                  )}
                  <Button variant="pill" icon="BsCopy" copyValue={inviteLink} />
                </Box>
              )}
            </div>
          </>
        ) : isWhitelisted ? (
          <>
            <div className={styles.linkContainer}>
              <Text style="14-400" color="text-tertiary">
                {inviteTranslations.joinToGetInviteLink}
              </Text>
            </div>
            <div className={styles.buttonContainer}>
              <Button
                variant="pill"
                text={isJoining ? "Joining..." : "Join"}
                loading={isJoining}
                disabled={isJoining}
                onClick={handleJoin}
              />
            </div>
          </>
        ) : (
          <div className={styles.linkContainer}>
            <Text style="14-400" color="error">
              {inviteTranslations.whitelistRequired}
            </Text>
          </div>
        )}
      </div>
    </Box>
  )
}
