"use client"

import { Box, Icon, Text } from "ui"

import { useTranslation } from "translations"
import { truncateString } from "@/components/Utils/format"

export default function InviteesListBox(props: {
  invitees: ReadonlyArray<string>
  pendingInvitees: ReadonlyArray<string>
}) {
  const { invitees, pendingInvitees } = props

  const { translations } = useTranslation()
  const inviteTranslations = translations.invite

  return (
    <Box vertical elevation="high" align="start">
      <Text style="16-400">{inviteTranslations.whoJoined}</Text>

      {invitees.map((address) => (
        <Box key={address}>
          <Text style="16-600" color="text-secondary" translate="no">
            {truncateString(address, 6, 6)}
          </Text>
          {pendingInvitees?.includes(address) ? (
            <Icon name="BsClockHistory" />
          ) : (
            <Icon name="BsCheckCircleFill" color="main" />
          )}
        </Box>
      ))}

      <Box gap="small" width="content">
        <Icon name="BsInfoCircleFill" size="big" />
        <Text style="14-400" color="text-secondary">
          {inviteTranslations.friendReminder}
        </Text>
      </Box>
    </Box>
  )
}
