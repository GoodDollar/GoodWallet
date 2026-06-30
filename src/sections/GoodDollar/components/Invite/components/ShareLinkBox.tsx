"use client"

import React from "react"
import { Box, Button, createToast, Text } from "ui"

import { useTranslation } from "translations"
import { AnalyticsEventTypes } from "@/analytics/types"
import { captureEvent } from "@/analytics/useAnalytics"
import {
  type EncodedMethod,
  estimateTypeAndFees,
  sendTxWaitForMining,
} from "@/ethers-utils"
import { refreshInviteStore, type User } from "@/gooddollar/stores/inviteStore"
import { getTx } from "@/gooddollar/stores/utils"
import { sessionState } from "@/login/context/SessionContext/storage"
import { canShare } from "@/utils/share"

export default function ShareLinkBox(props: {
  user: User
  isWhitelisted: boolean
  chainId: number
  bountyAmount: bigint
  getJoinCallData: (inviteCode: string | null) => Promise<EncodedMethod>
}) {
  const { user, isWhitelisted, getJoinCallData, chainId, bountyAmount } = props
  const hasInviteCode = user.inviteCode.length > 0

  const { translations } = useTranslation()
  const inviteTranslations = translations.invite

  const [isJoining, setIsJoining] = React.useState(false)

  const myInvLink = hasInviteCode
    ? `http://${window.location.host}?inviteCode=${user.inviteCode}&chainId=${chainId}`
    : ""

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
      await sendTxWaitForMining(
        signer,
        gasLimit,
        broadCastRequest,
        broadcastOptions,
        true,
      )

      captureEvent({
        type: AnalyticsEventTypes.GoodDollarInviteJoinSucceeded,
        chainId: chainId,
        rewardAmount: Number(bountyAmount),
      })
      refreshInviteStore()
      createToast({
        status: "success",
        autoClose: true,
        message: "Joined Successfully",
      })
    } catch (error) {
      console.error(error)
      createToast({
        status: "error",
        autoClose: true,
        message: "Failed to join",
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
    <Box vertical elevation="high" align="start">
      <Text style="16-400">{inviteTranslations.invite}</Text>

      {hasInviteCode ? (
        <>
          <Text style="14-400" color="text-tertiary">
            {myInvLink}
          </Text>

          <Box gap="small" width="content">
            {canShare(myInvLink) && (
              <Button
                variant="pill"
                text="Share"
                onClick={() => navigator.share({ text: myInvLink })}
              />
            )}
            <Button variant="pill" icon="BsCopy" copyValue={myInvLink} />
          </Box>
        </>
      ) : isWhitelisted ? (
        <>
          <Text style="14-400" color="text-tertiary">
            {inviteTranslations.joinToGetInviteLink}
          </Text>
          <Button
            variant="pill"
            text={isJoining ? "Joining..." : "Join"}
            loading={isJoining}
            disabled={isJoining}
            onClick={handleJoin}
          />
        </>
      ) : (
        <Text style="14-400" color="error">
          {inviteTranslations.whitelistRequired}
        </Text>
      )}
    </Box>
  )
}
