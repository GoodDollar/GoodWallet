import type { Jsonify } from "type-fest"
import { proxy, ref } from "valtio"

import { getPrivateKeySession } from "@/login/adapters/privatekey"
import {
  disconnectReown,
  getReownSession,
  watchReownAccount,
} from "@/login/reown"
import type { Addresses, ISigner, ISignerSession } from "@/login/types"
import { resetWalletConnectDialogs } from "@/sections/WalletConnect/store/walletConnectDialogStore"

const SIGNER_SESSION_KEY = "SIGNER_SESSION"

export const getSessionFromLocalStorage =
  async (): Promise<ISignerSession | null> => {
    if (typeof localStorage === "undefined") {
      return null
    }
    const session = localStorage.getItem(SIGNER_SESSION_KEY)
    if (!session) {
      return null
    }
    const sessionJSON = JSON.parse(session) as Jsonify<ISignerSession>
    return await fromJSON(sessionJSON)
  }

const fromJSON = async (
  sessionJSON: Partial<Jsonify<ISignerSession>>,
): Promise<ISignerSession | null> => {
  switch (sessionJSON.type) {
    case "PRIVATE_KEY": {
      const { userName, profileImage, authProvider, masterSeed } = sessionJSON
      if (!masterSeed) {
        return null
      }
      return await getPrivateKeySession(
        masterSeed,
        "localStorage",
        authProvider ?? "NA",
        userName,
        profileImage,
      )
    }
    case "REOWN": {
      const { authProvider, address } = sessionJSON
      if (!address) {
        return null
      }

      return await getReownSession(
        "localStorage",
        authProvider ?? "existing_wallet",
        {
          interactive: false,
          expectedAddress: address,
        },
      )
    }
  }
  return null
}

export type ReconnectReason = "accountChanged" | "restoreFailed"

type SessionState = {
  session: null | ISignerSession
  addresses?: Addresses
  isLoading: boolean
  reconnectReason?: ReconnectReason
}

export const sessionState = proxy<SessionState>({
  session: null,
  addresses: undefined,
  isLoading: true,
  reconnectReason: undefined,
})

// Bumped on every session change so stale async restores are dropped.
let sessionVersion = 0
let stopAccountWatch: (() => void) | undefined

export const setSession = (session: ISignerSession | null) => {
  sessionVersion++
  stopAccountWatch?.()
  stopAccountWatch = undefined

  sessionState.session = session && ref(session)
  if (session) {
    const addressMap = new Map<keyof ISigner, string>()
    for (const [key, value] of Object.entries(session.signer)) {
      if (value) addressMap.set(key as keyof ISigner, value.address)
    }
    sessionState.addresses = addressMap
    sessionState.reconnectReason = undefined
  } else {
    sessionState.addresses = undefined
  }

  if (sessionState.session) {
    localStorage.setItem(
      SIGNER_SESSION_KEY,
      JSON.stringify(sessionState.session),
    )
  } else {
    localStorage.removeItem(SIGNER_SESSION_KEY)
  }

  sessionState.isLoading = false

  if (session?.type === "REOWN") {
    stopAccountWatch = watchReownAccount(session.address, () =>
      endSession("accountChanged"),
    )
  }
}

const disconnectDappSessions = async () => {
  const { disconnectAllWalletConnectSessions } = await import(
    "@/sections/WalletConnect/store/walletConnectStore"
  )
  await disconnectAllWalletConnectSessions()
}

const endSession = (reconnectReason?: ReconnectReason) => {
  resetWalletConnectDialogs()
  const previousSession = sessionState.session
  setSession(null)
  sessionState.reconnectReason = reconnectReason

  if (previousSession?.type === "REOWN") {
    disconnectDappSessions().catch((error) => {
      console.error("Failed to disconnect WalletConnect sessions", error)
    })
    disconnectReown().catch((error) => {
      console.error("Failed to disconnect Reown session", error)
    })
  }
}

export const logout = () => endSession()

const getStoredSessionType = () => {
  try {
    const stored = localStorage.getItem(SIGNER_SESSION_KEY)
    return stored ? (JSON.parse(stored) as { type?: string }).type : undefined
  } catch {
    return undefined
  }
}

const restoreSession = async () => {
  const version = sessionVersion
  try {
    const session = await getSessionFromLocalStorage()
    if (version === sessionVersion) setSession(session)
  } catch (e) {
    console.error("error getting persisted session", e)
    if (version !== sessionVersion) return
    const wasReown = getStoredSessionType() === "REOWN"
    setSession(null)
    if (wasReown) sessionState.reconnectReason = "restoreFailed"
  }
}

if (typeof window !== "undefined") {
  restoreSession()
}
