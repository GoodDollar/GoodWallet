import { proxy, subscribe } from "valtio"

import type { CELO_CHAIN_ID, XDC_CHAIN_ID } from "@/chain/chain-ids"
import { config } from "@/config"

const INVITE_CODE_STORAGE_KEY = "inviteCode"
const INVITE_CHAINID_STORAGE_KEY = "inviteChainId"

export type INVITEABLE_CHAIN_ID = typeof CELO_CHAIN_ID | typeof XDC_CHAIN_ID
const getInviteCodeFromLocalStorage = () => {
  if (typeof localStorage === "undefined") {
    return { inviteCode: null, chainId: config.primayInviteChainId.toString() }
  }
  return {
    inviteCode: localStorage.getItem(INVITE_CODE_STORAGE_KEY),
    chainId: String(
      localStorage.getItem(INVITE_CHAINID_STORAGE_KEY) ||
        config.primayInviteChainId,
    ),
  }
}

type InviteCodeState = {
  inviteCode: string | null
  chainId: string | null
}

export const inviteCodeStore = proxy<InviteCodeState>({
  ...getInviteCodeFromLocalStorage(),
})

const persistInviteCode = () => {
  if (typeof localStorage === "undefined") {
    return
  }
  if (inviteCodeStore.inviteCode) {
    localStorage.setItem(INVITE_CODE_STORAGE_KEY, inviteCodeStore.inviteCode)
    localStorage.setItem(
      INVITE_CHAINID_STORAGE_KEY,
      String(inviteCodeStore.chainId),
    )
  } else {
    localStorage.removeItem(INVITE_CODE_STORAGE_KEY)
    localStorage.removeItem(INVITE_CHAINID_STORAGE_KEY)
  }
}
subscribe(inviteCodeStore, persistInviteCode)
