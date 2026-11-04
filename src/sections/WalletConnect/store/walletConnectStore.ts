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

export const isSessionCompatibleWithSigner = (
  session: SessionTypes.Struct,
  signer: ISigner,
): boolean => {
  const namespaces = session.namespaces || {}
  for (const [ns, data] of Object.entries(namespaces)) {
    if (ns === "eip155") {
      const evmAddress = signer.EVM?.address?.toLowerCase()
      if (!evmAddress) return false
      for (const account of data.accounts || []) {
        const address = account.split(":").pop()?.toLowerCase()
        if (address && address !== evmAddress) {
          return false
        }
      }
    } else if (ns === "solana") {
      if (!signer.SOLANA && !signer.SOLANA_DEVNET) return false
      const solAddress = signer.SOLANA?.address || signer.SOLANA_DEVNET?.address
      for (const account of data.accounts || []) {
        const address = account.split(":").pop()
        if (address && address !== solAddress) {
          return false
        }
      }
    } else if (ns === "bip122") {
      if (!signer.BTC && !signer.BTC_TESTNET) return false
      const btcAddress = signer.BTC?.address || signer.BTC_TESTNET?.address
      for (const account of data.accounts || []) {
        const address = account.split(":").pop()
        if (address && address !== btcAddress) {
          return false
        }
      }
    } else {
      return false
    }
  }
  return true
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

const initializeWalletConnect = async (signer: ISigner) => {
  if (!config.walletConnectEnabled) {
    return
  }
  activeSigner = signer
  let wallet: WalletKit | undefined
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
    wallet = await WalletKit.init({
      core,
      metadata,
    })
    setupListeners(getActiveSigner, wallet, refreshSessions)
    const wcUri = getWCUri()

    if (wcUri) {
      wallet.pair({ uri: wcUri })
    }
    walletConnectState.walletConnectInstance = ref(wallet)
  } else if (walletConnectState.walletConnectInstance !== "initializing") {
    wallet = walletConnectState.walletConnectInstance
  }

  // Restored sessions must not silently rebind to a new signer:
  // disconnect incompatible sessions before the new signer is usable.
  if (wallet) {
    await disconnectIncompatibleSessions(wallet, signer)
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
