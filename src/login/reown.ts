import { type CreateAppKit, createAppKit } from "@reown/appkit"
import { EthersAdapter } from "@reown/appkit-adapter-ethers"
import {
  BrowserProvider,
  type Eip1193Provider,
  type TransactionRequest,
} from "ethers"

import manifest from "@/app/manifest"
import { CELO_CHAIN_ID } from "@/chain/chain-ids"
import { AVAILABLE_EVM_CHAINS } from "@/chain/chains"
import type { Chain } from "@/chain/types"
import { config } from "@/config"

import type { ISignerSession } from "./types"

type GetReownSessionOptions = {
  interactive?: boolean
  expectedAddress?: string
}

type AppKit = ReturnType<typeof createAppKit>

export class ReownConnectionCancelledError extends Error {
  constructor() {
    super("Wallet connection was cancelled")
    this.name = "ReownConnectionCancelledError"
  }
}

let appKitPromise: Promise<AppKit> | undefined
let appKitInstance: AppKit | undefined

const getMetadata = () => {
  const { name, description, icons } = manifest()
  const url =
    typeof window !== "undefined" ? window.location.origin : "http://localhost"

  return {
    name: name ?? "GoodWallet",
    description:
      description ?? "Claim UBI and exchange cryptocurrencies with GoodWallet",
    url,
    icons: (icons ?? []).map((icon) => `${url}${icon.src}`),
  }
}

type AppKitNetwork = CreateAppKit["networks"][number]

// Plain fields only: AppKit bundles its own viem, so fee/formatter types differ.
const toAppKitNetwork = ({
  id,
  name,
  nativeCurrency,
  rpcUrls,
  blockExplorers,
  testnet,
}: Chain): AppKitNetwork => ({
  id,
  name,
  nativeCurrency,
  rpcUrls,
  blockExplorers,
  testnet,
})

const getNetworks = () => {
  const [first, ...rest] = Array.from(AVAILABLE_EVM_CHAINS.values()).map(
    toAppKitNetwork,
  )
  if (!first) {
    throw new Error("No EVM networks available")
  }
  const networks: CreateAppKit["networks"] = [first, ...rest]
  return {
    networks,
    defaultNetwork:
      networks.find((network) => network.id === CELO_CHAIN_ID) ?? first,
  }
}

const getAppKit = async (): Promise<AppKit> => {
  if (typeof window === "undefined") {
    throw new Error("Reown login is only available in browser")
  }

  if (!config.walletConnectEnabled) {
    throw new Error("WalletConnect is not configured")
  }

  appKitPromise ??= (async () => {
    appKitInstance ??= createAppKit({
      adapters: [new EthersAdapter()],
      projectId: config.walletConnectProjectId,
      metadata: getMetadata(),
      ...getNetworks(),
    })
    await appKitInstance.ready()
    return appKitInstance
  })().catch((error) => {
    // Allow a later attempt to retry initialization.
    appKitPromise = undefined
    throw error
  })

  return appKitPromise
}

type WaitOptions = {
  timeoutMs: number
  cancelOnModalClose?: boolean
  signal?: AbortSignal
}

const MODAL_CLOSE_GRACE_MS = 1500

const waitForConnectedAddress = (
  appKit: AppKit,
  { timeoutMs, cancelOnModalClose = false, signal }: WaitOptions,
): Promise<string | null> => {
  const currentAddress = appKit.getAddress("eip155")
  if (currentAddress) {
    return Promise.resolve(currentAddress)
  }

  return new Promise((resolve, reject) => {
    let settled = false
    const cleanups: Array<() => void> = []
    const track = (cleanup: () => void) => {
      if (settled) cleanup()
      else cleanups.push(cleanup)
    }
    const finish = (settle: () => void) => {
      if (settled) return
      settled = true
      for (const cleanup of cleanups) cleanup()
      settle()
    }

    const timeout = setTimeout(() => finish(() => resolve(null)), timeoutMs)
    track(() => clearTimeout(timeout))

    track(
      appKit.subscribeAccount((state) => {
        const address = state.address
        if (state.isConnected && address) {
          finish(() => resolve(address))
        }
      }, "eip155"),
    )

    if (cancelOnModalClose) {
      let wasOpen = false
      track(
        appKit.subscribeState((state) => {
          if (state.open) {
            wasOpen = true
            return
          }
          if (!wasOpen) return
          // The account update can land shortly after the modal closes.
          const grace = setTimeout(() => {
            const address = appKit.getAddress("eip155")
            finish(() =>
              address
                ? resolve(address)
                : reject(new ReownConnectionCancelledError()),
            )
          }, MODAL_CLOSE_GRACE_MS)
          track(() => clearTimeout(grace))
        }),
      )
    }

    if (signal) {
      const onAbort = () => finish(() => reject(signal.reason))
      signal.addEventListener("abort", onAbort, { once: true })
      track(() => signal.removeEventListener("abort", onAbort))
    }
  })
}

const connectAddress = async (appKit: AppKit, interactive: boolean) => {
  const restoredAddress = await waitForConnectedAddress(appKit, {
    timeoutMs: interactive ? 1000 : 15000,
  })
  if (restoredAddress || !interactive) {
    return restoredAddress
  }

  const controller = new AbortController()
  const connected = waitForConnectedAddress(appKit, {
    timeoutMs: 120000,
    cancelOnModalClose: true,
    signal: controller.signal,
  })
  try {
    await appKit.open({ view: "Connect", namespace: "eip155" })
  } catch (error) {
    connected.catch(() => undefined)
    controller.abort(error)
    throw error
  }
  return await connected
}

const isSameAddress = (a?: string, b?: string) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase()

const getWalletSigner = async (appKit: AppKit, address: string) => {
  if (!isSameAddress(appKit.getAddress("eip155"), address)) {
    throw new Error("Connected wallet account changed. Please reconnect.")
  }
  const walletProvider = appKit.getProvider<Eip1193Provider>("eip155")
  if (!walletProvider) {
    throw new Error("Connected provider not available")
  }
  // A fresh provider avoids ethers "network changed" errors after switching.
  return await new BrowserProvider(walletProvider, "any").getSigner(address)
}

const ensureChain = async (
  appKit: AppKit,
  chainId: bigint | number | string | null | undefined,
) => {
  if (chainId === null || chainId === undefined) return
  const targetChainId = Number(chainId)
  if (Number(appKit.getChainId()) === targetChainId) return

  const chain = AVAILABLE_EVM_CHAINS.get(targetChainId)
  if (!chain) {
    throw new Error(`Chain ${targetChainId} is not supported`)
  }
  await appKit.switchNetwork(toAppKitNetwork(chain), { throwOnFailure: true })
  if (Number(appKit.getChainId()) !== targetChainId) {
    throw new Error(`Please switch your wallet to ${chain.name}`)
  }
}

const submitTransaction = async (
  appKit: AppKit,
  address: string,
  tx: TransactionRequest,
): Promise<string> => {
  await ensureChain(appKit, tx.chainId)
  const signer = await getWalletSigner(appKit, address)
  // The wallet owns nonce and fee selection for transactions it submits.
  const { nonce: _nonce, ...request } = tx
  return await signer.sendUncheckedTransaction(request)
}

export const getReownSession = async (
  sessionOrigin: string,
  authProvider: string,
  options: GetReownSessionOptions = {},
): Promise<ISignerSession> => {
  const { interactive = true, expectedAddress } = options
  const appKit = await getAppKit()
  const connectedAddress = await connectAddress(appKit, interactive)

  if (!connectedAddress) {
    throw new Error("Wallet connection was not completed")
  }

  if (expectedAddress && !isSameAddress(connectedAddress, expectedAddress)) {
    throw new Error("Connected wallet does not match the previous session")
  }

  if (!appKit.getProvider<Eip1193Provider>("eip155")) {
    throw new Error("Connected provider not available")
  }

  return {
    type: "REOWN",
    sessionOrigin,
    authProvider,
    address: connectedAddress,
    userName: connectedAddress,
    signer: {
      EVM: {
        address: connectedAddress,
        signMessage: async (message) =>
          (await getWalletSigner(appKit, connectedAddress)).signMessage(
            message,
          ),
        signTypedData: async (domain, types, value) => {
          await ensureChain(appKit, domain.chainId)
          return (
            await getWalletSigner(appKit, connectedAddress)
          ).signTypedData(domain, types, value)
        },
        signTransaction: async () => {
          throw new Error("Connected wallets cannot sign raw transactions")
        },
        submitTransaction: (tx) =>
          submitTransaction(appKit, connectedAddress, tx),
      },
    },
  }
}

// EIP-1193 provider of the connected wallet, switched to chainId when given.
export const getReownEip1193Provider = async (
  address: string,
  chainId?: number,
) => {
  const appKit = await getAppKit()
  await ensureChain(appKit, chainId)
  if (!isSameAddress(appKit.getAddress("eip155"), address)) {
    throw new Error("Connected wallet account changed. Please reconnect.")
  }
  const provider = appKit.getProvider<Eip1193Provider>("eip155")
  if (!provider) {
    throw new Error("Connected provider not available")
  }
  return { provider, chainId: Number(appKit.getChainId()) }
}

// Calls onChange when the wallet switches account or disconnects.
export const watchReownAccount = (
  address: string,
  onChange: () => void,
): (() => void) => {
  if (!appKitInstance) {
    return () => undefined
  }
  return appKitInstance.subscribeAccount((state) => {
    if (state.status === "connecting" || state.status === "reconnecting") {
      return
    }
    const changed = state.isConnected
      ? !isSameAddress(state.address, address)
      : state.status === "disconnected"
    if (changed) onChange()
  }, "eip155")
}

export const disconnectReown = async (): Promise<void> => {
  if (!appKitInstance) {
    return
  }

  await appKitInstance.disconnect("eip155")
}
