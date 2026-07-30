import { proxy, ref } from "valtio"

import type { Addresses, ISigner, ISignerSession } from "@/login/types"
import { resetWalletConnectDialogs } from "@/sections/WalletConnect/store/walletConnectDialogStore"

const SIGNER_SESSION_KEY = "SIGNER_SESSION"

const clearPersistedSession = () => {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(SIGNER_SESSION_KEY)
  }
}

type SessionState = {
  session: null | ISignerSession
  addresses?: Addresses
  isLoading: boolean
}

export const sessionState = proxy<SessionState>({
  session: null,
  addresses: undefined,
  isLoading: true,
})

export const setSession = (session: ISignerSession | null) => {
  sessionState.session = session && ref(session)
  if (session) {
    const addressMap = new Map<keyof ISigner, string>()
    for (const [key, value] of Object.entries(session.signer)) {
      addressMap.set(key as keyof ISigner, value.address)
    }
    sessionState.addresses = addressMap
  } else {
    sessionState.addresses = undefined
  }

  clearPersistedSession()
  sessionState.isLoading = false
}

export const logout = () => {
  resetWalletConnectDialogs()
  setSession(null)
}

clearPersistedSession()
sessionState.isLoading = false
