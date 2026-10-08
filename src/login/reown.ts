import { createAppKit } from "@reown/appkit"
import { base, celo, fuse, mainnet, xdc } from "@reown/appkit/networks"
import { EthersAdapter } from "@reown/appkit-adapter-ethers"
import { BrowserProvider, type Eip1193Provider } from "ethers"

import manifest from "@/app/manifest"
import { config } from "@/config"

import type { ISigner, ISignerSession } from "./types"

type GetReownSessionOptions = {
  interactive?: boolean
  expectedAddress?: string
}

let appKitInstance: ReturnType<typeof createAppKit> | undefined

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

const getAppKit = async () => {
  if (typeof window === "undefined") {
    throw new Error("Reown login is only available in browser")
  }

  if (!config.walletConnectEnabled) {
    throw new Error("WalletConnect is not configured")
  }

  if (!appKitInstance) {
    appKitInstance = createAppKit({
      adapters: [new EthersAdapter()],
      projectId: config.walletConnectProjectId,
      metadata: getMetadata(),
      networks: [celo, fuse, mainnet, base, xdc],
      defaultNetwork: celo,
    })
  }

  await appKitInstance.ready()
  return appKitInstance
}

const waitForConnectedAddress = async (
  appKit: ReturnType<typeof createAppKit>,
  timeoutMs = 120000,
): Promise<string | null> => {
  const currentAddress = appKit.getAddress("eip155")
  if (currentAddress) {
    return currentAddress
  }

  return await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      unsubscribe()
      resolve(null)
    }, timeoutMs)

    const unsubscribe = appKit.subscribeAccount((state) => {
      if (state.isConnected && state.address) {
        clearTimeout(timeout)
        unsubscribe()
        resolve(state.address)
      }
    }, "eip155")
  })
}

const connectAddress = async (
  appKit: ReturnType<typeof createAppKit>,
  interactive: boolean,
) => {
  const connectedAddress = await waitForConnectedAddress(
    appKit,
    interactive ? 1000 : 15000,
  )
  if (connectedAddress) {
    return connectedAddress
  }

  if (!interactive) {
    return null
  }

  const connected = waitForConnectedAddress(appKit)
  await appKit.open({ view: "Connect", namespace: "eip155" })
  return await connected
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

  if (
    expectedAddress &&
    connectedAddress.toLowerCase() !== expectedAddress.toLowerCase()
  ) {
    throw new Error("Connected wallet does not match the previous session")
  }

  const walletProvider = appKit.getProvider<Eip1193Provider>("eip155")
  if (!walletProvider) {
    throw new Error("Connected provider not available")
  }

  const provider = new BrowserProvider(walletProvider)
  const signer = await provider.getSigner(connectedAddress)

  const session: ISignerSession = {
    type: "REOWN",
    sessionOrigin,
    authProvider,
    address: connectedAddress,
    userName: connectedAddress,
    signer: {
      EVM: {
        address: connectedAddress,
        signMessage: (message: Parameters<typeof signer.signMessage>[0]) =>
          signer.signMessage(message),
        signTransaction: (tx: Parameters<typeof signer.signTransaction>[0]) =>
          signer.signTransaction(tx),
        signTypedData: (
          domain: Parameters<typeof signer.signTypedData>[0],
          types: Parameters<typeof signer.signTypedData>[1],
          value: Parameters<typeof signer.signTypedData>[2],
        ) => signer.signTypedData(domain, types, value),
      },
    } as unknown as ISigner,
  }

  return session
}

export const disconnectReown = async (): Promise<void> => {
  if (!appKitInstance) {
    return
  }

  await appKitInstance.disconnect("eip155")
}
