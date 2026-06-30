"use client"

import { useState } from "react"
import { formatUnits } from "ethers"
import { Box, Button, Drawer, Gift, Icon, Text } from "ui"
import { useSnapshot } from "valtio"

import { useTranslation } from "translations"
import { CELO_CHAIN_ID, XDC_CHAIN_ID } from "@/chain/chain-ids"
import { setBottomSheetProps } from "@/components/Snippet/BottomSheet/bottomSheetStore"
import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import { formatTokenAmount } from "@/components/Utils/tokenFormat"
import { identityStore } from "@/gooddollar/stores/identityStore"
import { inviteStore } from "@/gooddollar/stores/inviteStore"
import { useInvitedChainId } from "@/hooks/useInvitedChainId"
import Typography from "@/ui/typography/Typography"

import InvCodeBox from "./components/InvCodeBox"
import InviteesListBox from "./components/InviteesListBox"
import ShareLinkBox from "./components/ShareLinkBox"
import TotalEarnedBox from "./components/TotalEarnedBox"
import styles from "./InviteView.module.css"

// https://docs.gooddollar.org/about-the-protocol/protocol-v3-documentation/core-contracts-and-api/invites#inviteejoined

export default function InviteView() {
  const invitedChainId = useInvitedChainId()
  const invites = useSnapshot(inviteStore)
  const invite = invites[invitedChainId]
  const identity = useSnapshot(identityStore)[invitedChainId]
  const { translations } = useTranslation()
  const [isInfoSliderOpen, setIsInfoSliderOpen] = useState(false)
  const inviteTranslations = translations.invite

  setBottomSheetProps({ title: translations.gooddollar.title })

  if (
    invite.isLoading ||
    invites[CELO_CHAIN_ID].isLoading ||
    invites[XDC_CHAIN_ID].isLoading ||
    identity.isLoading
  )
    return <LoadingSpinner />
  if (
    invite.isError ||
    invites[CELO_CHAIN_ID].isError ||
    invites[XDC_CHAIN_ID].isError ||
    identity.isError
  )
    return <div>{"ERROR"}</div>

  const { user, getAddressForInviteCode } = invite
  const celoData = invites[CELO_CHAIN_ID]
  const xdcData = invites[XDC_CHAIN_ID]
  const userInfo = {
    ...user,
    totalEarned:
      (celoData.isLoading || celoData.isError
        ? BigInt(0)
        : celoData.user.totalEarned) +
      (xdcData.isLoading || xdcData.isError
        ? BigInt(0)
        : xdcData.user.totalEarned),
    totalInvitees: (celoData.isLoading || celoData.isError
      ? []
      : celoData.invitees
    ).concat(xdcData.isLoading || xdcData.isError ? [] : xdcData.invitees),
    totalPendingInvitees: (celoData.isLoading || celoData.isError
      ? []
      : celoData.pendingInvitees
    ).concat(
      xdcData.isLoading || xdcData.isError ? [] : xdcData.pendingInvitees,
    ),
  }

  const inviterBounty =
    invite.isLoading || invite.isError ? BigInt(0) : invite.bountyLevel.bounty

  const { shareLink, ensureSignup, daysEligibility, rewardReceival } =
    inviteTranslations
  const inviteStepsTranslations = [
    shareLink,
    ensureSignup(invite.minimumClaims),
    daysEligibility(invite.minimumDays),
    rewardReceival,
  ]

  return (
    <div className={styles.pageContainer}>
      <Box vertical gap="large">
        <div
          style={{
            background: "var(--brand-gradient)",
            maskImage: `url(${Gift.src})`,
            WebkitMaskImage: `url(${Gift.src})`,
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
            width: 150,
            height: 100,
          }}
        />

        <Typography style="24-600" align="center">
          {invite.bountyLevel
            ? inviteTranslations.reward(
                formatTokenAmount(formatUnits(inviterBounty, 18), "G$"),
              )
            : null}
        </Typography>

        <Typography style="16-400" align="center">
          {invite.bountyLevel
            ? inviteTranslations.inviteeReward(
                formatTokenAmount(
                  formatUnits(inviterBounty / BigInt(2), 18),
                  "G$",
                ),
              )
            : null}
        </Typography>

        <Button
          variant="ghost"
          icon="BsInfoCircleFill"
          text={inviteTranslations.how}
          onClick={() => setIsInfoSliderOpen(true)}
        />
      </Box>

      <ShareLinkBox
        user={user}
        isWhitelisted={identity.isWhitelisted}
        getJoinCallData={invite.getJoinCallData}
        chainId={invitedChainId}
        bountyAmount={inviterBounty}
      />
      <InvCodeBox
        user={user}
        whitelistedOnChain={identity.whitelistedOnChainOrDefault}
        getAddressForInviteCode={getAddressForInviteCode}
      />
      <TotalEarnedBox user={userInfo} />
      {userInfo.totalEarned > 0 && (
        <InviteesListBox
          invitees={userInfo.totalInvitees}
          pendingInvitees={userInfo.totalPendingInvitees}
        />
      )}

      <Drawer
        open={isInfoSliderOpen}
        onClose={() => setIsInfoSliderOpen(false)}
      >
        <Text style="24-600">{inviteTranslations.how}</Text>

        {inviteStepsTranslations.map((step, index) => (
          <Box gap="small" width="content" key={index}>
            <div className={styles.gradientStepBtn}>
              {(index + 1).toString()}
            </div>
            <Text style="14-400" color="text-soft">
              {step}
            </Text>
          </Box>
        ))}

        <Text style="14-400" color="text-tertiary">
          {inviteTranslations.sponsoredBy}
          {invitedChainId === CELO_CHAIN_ID ? (
            <Icon name="celoLogo" size="larger" color="white" opacity="dim" />
          ) : (
            <Icon name="xdcLogo" size="larger" color="white" opacity="dim" />
          )}
        </Text>
      </Drawer>
    </div>
  )
}
