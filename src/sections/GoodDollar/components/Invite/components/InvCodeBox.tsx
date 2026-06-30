"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useDebouncedEffect } from "@react-hookz/web"
import { Box, Icon, Text } from "ui"
import { useSnapshot } from "valtio"

import { useTranslation } from "translations"
import { config } from "@/config"
import { isSameAddress, ZERO_ADDRESS } from "@/ethers-utils"
import { inviteCodeStore } from "@/gooddollar/stores/inviteCodeStore"
import type { User } from "@/gooddollar/stores/inviteStore"
import { useSessionContext } from "@/login"

import styles from "../InviteView.module.css"

export default function InvCodeBox(props: {
  user: User
  getAddressForInviteCode: (inviteCode: string) => Promise<string>
  whitelistedOnChain: number
}) {
  const INVITE_CODE_MIN_LENGTH = 10
  const { user, whitelistedOnChain, getAddressForInviteCode } = props

  const { addresses } = useSessionContext()
  const evmAddress = addresses?.get("EVM")

  const { translations, locale } = useTranslation()
  const inviteTranslations = translations.invite
  const homeTranslations = translations.home

  const { inviteCode } = useSnapshot(inviteCodeStore)

  const [inviteCodeInputValue, setInviteCodeInputValue] = useState(inviteCode)
  const [isValidInviteCode, setIsValidInviteCode] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  // Set validating state whenever input changes
  useEffect(() => {
    if (inviteCodeInputValue) {
      setIsValidating(true)
    }
  }, [inviteCodeInputValue])

  useDebouncedEffect(
    async () => {
      inviteCodeStore.inviteCode = inviteCodeInputValue

      if (
        !inviteCodeInputValue ||
        inviteCodeInputValue.length < INVITE_CODE_MIN_LENGTH
      ) {
        setIsValidInviteCode(false)
        setIsValidating(false)
        return
      }

      if (!evmAddress) {
        return
      }

      const address = await getAddressForInviteCode(inviteCodeInputValue)
      if (
        isSameAddress(address, evmAddress) ||
        isSameAddress(address, ZERO_ADDRESS)
      ) {
        setIsValidInviteCode(false)
        setIsValidating(false)
        return
      }
      setIsValidInviteCode(true)
      setIsValidating(false)
    },
    [evmAddress, inviteCodeInputValue, getAddressForInviteCode],
    500,
    3000,
  )

  // Hide component if:
  // 1. User has gotten his bounty already
  // 2. User has already joined an inviter (invitedBy is not zero address)
  // 3. User did not first register on the default primary chain
  if (
    user.bountyPaid ||
    !isSameAddress(user.invitedBy, ZERO_ADDRESS) ||
    whitelistedOnChain !== config.primayInviteChainId
  ) {
    return null
  }

  return (
    <Box vertical elevation="high" align="start">
      <Text style="16-400">{inviteTranslations.inviteCode}</Text>

      <div className={styles.inputContainer}>
        <input
          className={`${styles.input} ${styles.inputField} ${
            inviteCodeInputValue
              ? styles.inputFieldWithValidation
              : styles.inputFieldStandard
          }`}
          type="input"
          placeholder={inviteTranslations.inviteCodePlaceholder}
          value={inviteCodeInputValue ?? undefined}
          onChange={(e) => setInviteCodeInputValue(e.target.value)}
        />

        {inviteCodeInputValue && (
          <div className={styles.validationIconContainer}>
            {isValidating ? (
              <Icon name="BsArrowRepeat" color="main" spin />
            ) : isValidInviteCode ? (
              <Icon name="BsCheckCircleFill" color="main" />
            ) : (
              <Icon name="BsExclamationCircleFill" color="red" />
            )}
          </div>
        )}
      </div>

      <Link
        className={styles.btn}
        href={isValidInviteCode ? `/${locale}/gooddollar` : ""}
        scroll={false}
        aria-disabled={!isValidInviteCode}
        onClick={(e) => {
          if (!isValidInviteCode) {
            e.preventDefault()
          }
        }}
        style={{
          pointerEvents: !isValidInviteCode ? "none" : "auto",
        }}
      >
        <Text
          style="14-400"
          color={!isValidInviteCode ? "text-tertiary" : "brand"}
        >
          {homeTranslations.claim}
        </Text>
      </Link>
    </Box>
  )
}
