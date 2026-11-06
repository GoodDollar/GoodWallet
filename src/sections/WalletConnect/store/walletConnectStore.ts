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
import { isSessionCompatibleWithSigner } from "../utils/sessionValidation"

export { isSessionCompatibleWithSigner }

export const INITIALIZE_WALLET_CONNECT_KEY = "INITIALIZE_WALLET_CONNECT"

type WalletConnectState = {
  walletConnectInstance: WalletKit | "initializing" | undefined
  sessions: SessionTypes.Struct[]
  initializeWalletConnect: (signer: ISigner) => Promise<void>
  refreshSessions: () => void
}

// Listeners resolve the signer per request so a reconnected session is used.
let activeSigner: ISigner | undefined
export const getActiveSigner = () => {
  if (!activeSigner) throw new Error("No active wallet session")
  return activeSigner
}

export const disconnectIncompatibleSessions = async (
  wallet: WalletKit,
  signer: ISigner,
) => {
  const sessions = Object.values(wallet.getActiveSessions())
  const incompatible = sessions.filter(
    (session) => !isSessionCompatibleWithSigner(session, signer),
  )
  if (incompatible.length > 0) {
    await Promise.allSettled(
      incompatible.map((session) =>
        wallet.disconnectSession({
          topic: session.topic,
          reason: getSdkError("USER_DISCONNECTED"),
        }),
      ),
    )
  }
}

let walletKitInitPromise: Promise<WalletKit> | undefined
let initGeneration = 0

export const _resetWalletConnectForTesting = () => {
  walletKitInitPromise = undefined
  initGeneration = 0
  activeSigner = undefined
}

const initializeWalletConnect = async (signer: ISigner) => {
  if (!config.walletConnectEnabled) {
    return
  }
  const generation = ++initGeneration
  activeSigner = undefined

  if (!walletConnectState.walletConnectInstance) {
    walletKitInitPromise = undefined
  }

  let wallet: WalletKit | undefined
  if (
    walletConnectState.walletConnectInstance &&
    walletConnectState.walletConnectInstance !== "initializing"
  ) {
    wallet = walletConnectState.walletConnectInstance
  } else {
    if (!walletKitInitPromise) {
      walletConnectState.walletConnectInstance = "initializing"
      if (typeof window !== "undefined") {
        sessionStorage.setItem(INITIALIZE_WALLET_CONNECT_KEY, "true")
      }
      walletKitInitPromise = (async () => {
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
        const instance = await WalletKit.init({
          core,
          metadata,
        })
        setupListeners(getActiveSigner, instance, refreshSessions)
        const wcUri = getWCUri()

        if (wcUri) {
          instance.pair({ uri: wcUri })
        }
        walletConnectState.walletConnectInstance = ref(instance)
        return instance
      })()
    }
    try {
      wallet = await walletKitInitPromise
    } catch (e) {
      walletKitInitPromise = undefined
      walletConnectState.walletConnectInstance = undefined
      throw e
    }
  }

  // Restored sessions must not silently rebind to a new signer:
  // disconnect incompatible sessions before the new signer is usable.
  if (wallet) {
    await disconnectIncompatibleSessions(wallet, signer)
  }

  // Guard signer publication: do not publish if superseded or disconnected.
  if (generation === initGeneration) {
    activeSigner = signer
    refreshSessions()
  }
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
  initGeneration++
  activeSigner = undefined
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
