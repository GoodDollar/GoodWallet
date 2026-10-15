import WalletKit from "@reown/walletkit"
import { Core } from "@walletconnect/core"
import type { SessionTypes } from "@walletconnect/types"
import { getSdkError } from "@walletconnect/utils"
import { proxy, ref } from "valtio"

import manifest from "@/app/manifest"
import { config } from "@/config"
import type { ISigner } from "@/login"
import { getWCUri } from "@/utils/reownAppKitWrapper"

import { setupListeners } from "../requests/RequestHandler"

export const INITIALIZE_WALLET_CONNECT_KEY = "INITIALIZE_WALLET_CONNECT"

type WalletConnectState = {
  walletConnectInstance: WalletKit | "initializing" | undefined
  sessions: SessionTypes.Struct[]
  initializeWalletConnect: (signer: ISigner) => Promise<void>
  refreshSessions: () => void
}

// Listeners resolve the signer per request so a reconnected session is used.
let activeSigner: ISigner | undefined
const getActiveSigner = () => {
  if (!activeSigner) throw new Error("No active wallet session")
  return activeSigner
}

const initializeWalletConnect = async (signer: ISigner) => {
  if (!config.walletConnectEnabled) {
    return
  }
  activeSigner = signer
  if (!walletConnectState.walletConnectInstance) {
    walletConnectState.walletConnectInstance = "initializing"
    if (typeof window !== "undefined") {
      sessionStorage.setItem(INITIALIZE_WALLET_CONNECT_KEY, "true")
    }
    const core = new Core({
      projectId: config.walletConnectProjectId,
    })

    const { name, description, icons } = manifest()
    if (!name || !icons || !description) {
      throw new Error(
        "manifest is missing required fields for WalletConnect metadata",
      )
    }
    const url = window.location.origin
    const iconUrls = icons.map((icon) => `${url}${icon.src}`)
    const metadata = {
      name,
      description,
      icons: iconUrls,
      url,
    }
    const wallet = await WalletKit.init({
      core,
      metadata,
    })
    setupListeners(getActiveSigner, wallet, refreshSessions)
    const wcUri = getWCUri()

    if (wcUri) {
      wallet.pair({ uri: wcUri })
    }
    walletConnectState.walletConnectInstance = ref(wallet)
  }
  refreshSessions()
}

const refreshSessions = () => {
  if (
    walletConnectState.walletConnectInstance &&
    walletConnectState.walletConnectInstance !== "initializing"
  ) {
    walletConnectState.sessions = Object.values(
      walletConnectState.walletConnectInstance.getActiveSessions(),
    )
  }
}

export const walletConnectState = proxy<WalletConnectState>({
  walletConnectInstance: undefined,
  sessions: [],
  initializeWalletConnect,
  refreshSessions,
})

export const disconnectAllWalletConnectSessions = async () => {
  const wallet = walletConnectState.walletConnectInstance
  if (!wallet || wallet === "initializing") return
  await Promise.allSettled(
    Object.values(wallet.getActiveSessions()).map((session) =>
      wallet.disconnectSession({
        topic: session.topic,
        reason: getSdkError("USER_DISCONNECTED"),
      }),
    ),
  )
  refreshSessions()
}
