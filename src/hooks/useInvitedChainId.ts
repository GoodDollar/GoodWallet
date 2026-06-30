"use client"

import { useSnapshot } from "valtio"

import { CELO_CHAIN_ID, XDC_CHAIN_ID } from "@/chain/chain-ids"
import { config } from "@/config"
import type { INVITEABLE_CHAIN_ID } from "@/gooddollar/stores/inviteCodeStore"
import { inviteCodeStore } from "@/gooddollar/stores/inviteCodeStore"

const INVITEABLE_CHAIN_IDS: INVITEABLE_CHAIN_ID[] = [
  CELO_CHAIN_ID,
  XDC_CHAIN_ID,
]

function parseInviteableChainId(
  value: string | null,
): INVITEABLE_CHAIN_ID | null {
  if (value == null) return null
  const n = Number(value)
  return INVITEABLE_CHAIN_IDS.includes(n as INVITEABLE_CHAIN_ID)
    ? (n as INVITEABLE_CHAIN_ID)
    : null
}

export function useInvitedChainId(): INVITEABLE_CHAIN_ID {
  const { chainId } = useSnapshot(inviteCodeStore)
  return parseInviteableChainId(chainId) ?? config.primayInviteChainId
}
