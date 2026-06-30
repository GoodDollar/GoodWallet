import type { RpcUrls } from "ethers-utils"
import { setCustomRpcUrls } from "ethers-utils/config"
import type { ClaimConfig } from "gooddollar"
import {
  BASE_CHAIN_ID,
  BITCOIN_CHAIN_ID,
  BNB_CHAIN_ID,
  CELO_CHAIN_ID,
  ETHEREUM_CHAIN_ID,
  FUSE_CHAIN_ID,
  HOODI_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  POLYGON_CHAIN_ID,
  SEPOLIA_CHAIN_ID,
  SOLANA_CHAIN_ID,
  SOLANA_DEVNET_CHAIN_ID,
  XDC_CHAIN_ID,
  XRP_CHAIN_ID,
  XRP_TESTNET_CHAIN_ID,
} from "@/chain/chain-ids"
import type { INVITEABLE_CHAIN_ID } from "@/gooddollar/stores/inviteCodeStore"
import type { TorusConfig } from "@/login/torus"

const env = process.env.NODE_ENV

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? ""
const walletConnectEnabled = walletConnectProjectId.length > 0
if (!walletConnectEnabled) {
  console.warn(
    "Missing NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID env variable — WalletConnect features will be disabled at runtime.",
  )
}

const faqUrl = "https://docs.gooddollar.org/wallet-and-products/new-goodwallet"
const sentryConfig = {
  // Omitting NEXT_PUBLIC_SENTRY_DSN will disable Sentry silently
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  replaysOnErrorSampleRate: Number(
    process.env.NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE ?? 0.1,
  ),
  replaysSessionSampleRate: Number(
    process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE ?? 0.0,
  ),
  tracesSampleRate: Number(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1,
  ),
  environment: env,
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === "true",
}

type EnabledLoginOptions = {
  google: boolean
  facebook: boolean
  pwless: boolean
  testLogin: {
    enabled: boolean
    masterSeed: string
    userName: string
    profileImage: string
  }
}

const enabledLoginOptions: EnabledLoginOptions = {
  google: process.env.NEXT_PUBLIC_LOGIN_GOOGLE_ENABLED === "true",
  facebook: process.env.NEXT_PUBLIC_LOGIN_FACEBOOK_ENABLED === "true",
  pwless: process.env.NEXT_PUBLIC_LOGIN_PWLESS_ENABLED === "true",
  testLogin: {
    masterSeed: process.env.NEXT_PUBLIC_TEST_LOGIN_MASTER_SEED as string,
    userName: process.env.NEXT_PUBLIC_TEST_LOGIN_USER_NAME as string,
    profileImage: process.env.NEXT_PUBLIC_TEST_LOGIN_PROFILE_IMAGE as string,
    enabled: process.env.NEXT_PUBLIC_TEST_LOGIN_ENABLED === "true",
  },
}

const includeTestnetTokens =
  process.env.NEXT_PUBLIC_INCLUDE_TESTNET_TOKENS === "true"

const lifiConfig = {
  apiUrl: "https://li.quest/v1",
  chainTypes: ["EVM", "UTXO", "SVM"],
  chainIds: [
    ETHEREUM_CHAIN_ID,
    FUSE_CHAIN_ID,
    CELO_CHAIN_ID,
    POLYGON_CHAIN_ID,
    BNB_CHAIN_ID,
    OPTIMISM_CHAIN_ID,
    BASE_CHAIN_ID,
    BITCOIN_CHAIN_ID,
    SOLANA_CHAIN_ID,
    XDC_CHAIN_ID,
  ],
}

const alchemyConfig = {
  // This is the chainIds that use Alchemy as RPC
  chainIds: [
    ETHEREUM_CHAIN_ID,
    POLYGON_CHAIN_ID,
    BNB_CHAIN_ID,
    OPTIMISM_CHAIN_ID,
    BASE_CHAIN_ID,
  ],
}

const rpcUrls: RpcUrls = {
  [String(ETHEREUM_CHAIN_ID)]: process.env
    .NEXT_PUBLIC_ETHEREUM_RPC_URL as string,
  [String(FUSE_CHAIN_ID)]: process.env.NEXT_PUBLIC_FUSE_RPC_URL as string,
  [String(CELO_CHAIN_ID)]: process.env.NEXT_PUBLIC_CELO_RPC_URL as string,
  [String(SEPOLIA_CHAIN_ID)]: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL as string,
  [String(HOODI_CHAIN_ID)]: process.env.NEXT_PUBLIC_HOODI_RPC_URL as string,
  [String(POLYGON_CHAIN_ID)]: process.env.NEXT_PUBLIC_POLYGON_RPC_URL as string,
  [String(BNB_CHAIN_ID)]: process.env.NEXT_PUBLIC_BNB_RPC_URL as string,
  [String(OPTIMISM_CHAIN_ID)]: process.env
    .NEXT_PUBLIC_OPTIMISM_RPC_URL as string,
  [String(BASE_CHAIN_ID)]: process.env.NEXT_PUBLIC_BASE_RPC_URL as string,
  [String(XDC_CHAIN_ID)]: process.env.NEXT_PUBLIC_XDC_RPC_URL as string,
}

const solanaRpcsUrls: RpcUrls = {
  [String(SOLANA_CHAIN_ID)]:
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "mainnet",
  [String(SOLANA_DEVNET_CHAIN_ID)]:
    process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL || "devnet",
}

const xrpRpcUrls: RpcUrls = {
  [String(XRP_CHAIN_ID)]:
    process.env.NEXT_PUBLIC_XRP_RPC_URL || "wss://xrplcluster.com/",
  [String(XRP_TESTNET_CHAIN_ID)]:
    process.env.NEXT_PUBLIC_XRP_TESTNET_RPC_URL ||
    "wss://s.altnet.rippletest.net:51233/",
}

const torus: TorusConfig = {
  network:
    (process.env.NEXT_PUBLIC_WEB3AUTH_NETWORK as "mainnet" | "testnet") ??
    "mainnet",
  web3AuthClientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENTID as string,
  useCoreKitKey: process.env.NEXT_PUBLIC_WEB3AUTH_COREKIT_ENABLED === "true",
  captchaKey: process.env.NEXT_PUBLIC_WEB3AUTH_AUTH0_CAPTCHA_KEY as string,
  providers: {
    google: {
      aggregateVerifierType: "single_id_verifier" as const,
      verifierIdentifier: process.env
        .NEXT_PUBLIC_WEB3AUTH_GOOGLE_VERIFIER as string,
      subVerifierDetailsArray: [
        {
          clientId: process.env.NEXT_PUBLIC_WEB3AUTH_GOOGLE_CLIENTID as string,
          typeOfLogin: "google" as const,
          verifier: process.env
            .NEXT_PUBLIC_WEB3AUTH_GOOGLE_SUBVERIFIER as string,
        },
      ],
    },
    facebook: {
      clientId: process.env.NEXT_PUBLIC_WEB3AUTH_FACEBOOK_CLIENTID as string,
      verifier: process.env.NEXT_PUBLIC_WEB3AUTH_FACEBOOK_VERIFIER as string,
      typeOfLogin: "facebook" as const,
    },
    pwdless: {
      verifier: process.env.NEXT_PUBLIC_WEB3AUTH_AUTH0_VERIFIER as string,
      clientId: process.env.NEXT_PUBLIC_WEB3AUTH_AUTH0_CLIENTID as string,
      typeOfLogin: "jwt" as const,
      jwtParams: {
        connection: "",
        domain: process.env.NEXT_PUBLIC_WEB3AUTH_AUTH0_DOMAIN as string,
        verifierIdField: "name",
      },
    },
  },
}

const g$claim: ClaimConfig = {
  contracts: process.env
    .NEXT_PUBLIC_GOODDOLLAR_CONTRACTS as ClaimConfig["contracts"],
}

const amplitudeConfig = {
  apiKey: process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY,
}

type VercelConfig = {
  commitSha: string | undefined
}

/**
 * Please note: VERCEL_GIT_COMMIT_SHA will be undefined whne working locally
 */
const vercelConfig: VercelConfig = {
  commitSha: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
}

type NewsStreamConfig = {
  feedUrl: string
  context: string
  tag?: string
}

export const newsStreamConfig: NewsStreamConfig = {
  feedUrl: process.env.NEXT_PUBLIC_GOODDOLLAR_FEED_URL as string,
  context: process.env.NEXT_PUBLIC_GOODDOLLAR_FEED_CTX as string,
  tag: process.env.NEXT_PUBLIC_GOODDOLLAR_FEED_TAG,
}

const primayInviteChainId: INVITEABLE_CHAIN_ID =
  (Number(
    process.env.NEXT_PUBLIC_PRIMARY_INVITE_CHAIN_ID,
  ) as INVITEABLE_CHAIN_ID) || CELO_CHAIN_ID

export const config = Object.freeze({
  vercelConfig,
  env,
  includeTestnetTokens,
  enabledLoginOptions,
  lifiConfig,
  alchemyConfig,
  rpcUrls,
  torus,
  g$claim,
  sentryConfig,
  amplitudeConfig,
  solanaRpcsUrls,
  primayInviteChainId,
  xrpRpcUrls,
  newsStreamConfig,
  faqUrl,
  walletConnectProjectId,
  walletConnectEnabled,
})

setCustomRpcUrls(config.rpcUrls)
