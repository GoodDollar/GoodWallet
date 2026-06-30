// LiFi SDK will be dynamically imported to reduce initial bundle size

import type { Config, CreateConnectorFn } from "@bigmi/client"
import {
  createConfig as createConfigBigmi,
  getConnectorClient,
} from "@bigmi/client"
import {
  bitcoin,
  createClient as createBigmiClient,
  http as HttpBigmi,
} from "@bigmi/core"
import type { SDKClient, SDKProvider } from "@lifi/sdk"
import { proxy, ref } from "valtio"
import { subscribeKey } from "valtio/utils"
import { createWalletClient, http } from "viem"
import {
  base,
  bsc,
  celo,
  fuse,
  mainnet,
  optimism,
  polygon,
  xdc,
} from "viem/chains"

import { config } from "@/config"
import { sessionState } from "@/login/context/SessionContext/storage"
import type { ISigner } from "@/login/types"

import { bitcoinAdapter } from "./adapters/bitcoinWalletAdapter"
import { createSolanaWallet } from "./adapters/solanaWalletAdapter"
import { getViemAccount } from "./adapters/viemWalletAdapter"

type LifiState =
  | {
      isInitialized: true
      client: SDKClient
      error: null
    }
  | {
      isInitialized: false
      client: null
      error: null | string
    }

export const lifiState = proxy<LifiState>({
  isInitialized: false,
  client: null,
  error: null,
})

const chains = [celo, mainnet, fuse, polygon, bsc, optimism, base, xdc]
const getLifiRpcUrls = () => {
  // LI.FI does its own balance reads during execution, so use the same
  // configured RPCs as the rest of the app instead of public defaults.
  const rpcUrls: Record<number, string[]> = {}
  for (const [chainId, rpcUrl] of Object.entries({
    ...config.rpcUrls,
    ...config.solanaRpcsUrls,
  })) {
    if (rpcUrl) rpcUrls[Number(chainId)] = [rpcUrl]
  }
  return rpcUrls
}

const initializeLifi = async (signer: ISigner | undefined) => {
  if (!signer) {
    lifiState.isInitialized = false
    lifiState.client = null
    lifiState.error = null
    return
  }
  try {
    // Dynamically import LiFi SDK to reduce initial bundle size
    const [
      { createClient },
      { EthereumProvider },
      { SolanaProvider },
      { BitcoinProvider },
    ] = await Promise.all([
      import("@lifi/sdk"),
      import("@lifi/sdk-provider-ethereum"),
      import("@lifi/sdk-provider-solana"),
      import("@lifi/sdk-provider-bitcoin"),
    ])

    const account = getViemAccount(signer.EVM)
    const walletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http(config.rpcUrls[mainnet.id]),
    })

    const providers: SDKProvider[] = [
      EthereumProvider({
        getWalletClient: async () => walletClient,
        switchChain: async (chainId) =>
          createWalletClient({
            account,
            chain: chains.find((chain) => chain.id == chainId),
            transport: http(config.rpcUrls[chainId]),
          }),
      }),
    ]
    if (signer.SOLANA) {
      const wallet = createSolanaWallet(signer.SOLANA)
      providers.push(
        SolanaProvider({
          getWallet: async () => wallet,
        }),
      )
    }
    if (signer.BTC) {
      const connectors: CreateConnectorFn[] = [bitcoinAdapter(signer.BTC)]
      const bigmiConfig = createConfigBigmi({
        chains: [bitcoin],
        connectors,
        ssr: true,
        client({ chain }) {
          return createBigmiClient({
            chain,
            transport: HttpBigmi(),
          })
        },
      }) as Config

      const connector = bigmiConfig.connectors[0]
      if (connector) {
        try {
          await connector.connect()
        } catch (error) {
          console.error("Failed to connect Bitcoin connector:", error)
        }
      }

      providers.push(
        BitcoinProvider({
          async getWalletClient() {
            return getConnectorClient(bigmiConfig)
          },
        }),
      )
    }

    const client = createClient({
      apiUrl: config.lifiConfig.apiUrl,
      integrator: "GoodDollar-GoodWallet",
      rpcUrls: getLifiRpcUrls(),
      providers,
    })

    // ref() prevents valtio from proxying the client (which would break
    // identity checks and mutation of internal SDK state).
    lifiState.client = ref(client)
    lifiState.isInitialized = true
    lifiState.error = null
  } catch (error) {
    lifiState.client = null
    lifiState.isInitialized = false
    lifiState.error = error instanceof Error ? error.message : "Unknown error"
    return
  }
}

initializeLifi(sessionState.session?.signer)
subscribeKey(sessionState, "session", (session) =>
  initializeLifi(session?.signer),
)
