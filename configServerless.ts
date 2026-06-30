import "server-only"

import {
  BASE_CHAIN_ID,
  BNB_CHAIN_ID,
  CELO_CHAIN_ID,
  ETHEREUM_CHAIN_ID,
  FUSE_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  POLYGON_CHAIN_ID,
  SOLANA_CHAIN_ID,
  SOLANA_DEVNET_CHAIN_ID,
  XDC_CHAIN_ID,
} from "@/chain/chain-ids"
import type { SUPPORTED_UTXO_FAMILIES } from "@/chain/provider/Bitcoin/types"
import type { SUPPORTED_XRP_FAMILIES } from "@/chain/provider/XRP/types"

type VercelConfig = {
  currentCommitGitSha: string
}

export const registerAddressPostAPIKey = {
  apiKey: process.env.AIRDROP_API_KEY as string,
}

export const polymarketKeys = {
  builderApiKey: process.env.POLYMARKET_BUILDER_API_KEY as string,
  builderSecret: process.env.POLYMARKET_BUILDER_SECRET as string,
  builderPassphrase: process.env.POLYMARKET_BUILDER_PASSPHRASE as string,
}

export const amplitudeConfig = {
  apiKey: process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY as string,
}

export const newVercelConfig: VercelConfig = {
  currentCommitGitSha: process.env.VERCEL_GIT_COMMIT_SHA as string,
}

type DbConfig = {
  url: string
}

export const tokensDBConfig: DbConfig = {
  url: process.env.POSTGRES_TOKENS_DATABASE_URL as string,
}

type TatumConfig = {
  endpoint: string
  apiKey: string | undefined
  rpcUrl: string
}

type SUPPORTED_FAMILIES = SUPPORTED_UTXO_FAMILIES | SUPPORTED_XRP_FAMILIES

export const tatumConfig: Record<SUPPORTED_FAMILIES, TatumConfig> = {
  BTC: {
    endpoint: "bitcoin",
    apiKey: process.env.TATUM_MAINNET_API_KEY,
    rpcUrl: "https://bitcoin-mainnet.gateway.tatum.io/",
  },
  BTC_TESTNET: {
    endpoint: "bitcoin-testnet",
    apiKey: process.env.TATUM_TESTNET_API_KEY,
    rpcUrl: "https://bitcoin-testnet.gateway.tatum.io/",
  },
  DOGE: {
    endpoint: "doge",
    apiKey: process.env.TATUM_MAINNET_API_KEY,
    rpcUrl: "https://doge-mainnet.gateway.tatum.io/",
  },
  DOGE_TESTNET: {
    endpoint: "doge-testnet",
    apiKey: process.env.TATUM_TESTNET_API_KEY,
    rpcUrl: "https://doge-testnet.gateway.tatum.io/",
  },
  XRP: {
    endpoint: "xrp",
    apiKey: process.env.TATUM_MAINNET_API_KEY,
    rpcUrl: "",
  },
  XRP_TESTNET: {
    endpoint: "xrp-testnet",
    apiKey: process.env.TATUM_TESTNET_API_KEY,
    rpcUrl: "",
  },
}

export const rpcConfig: {
  [key: number]: {
    url: string
    nativeToken: {
      name: string
      decimals: number
      symbol: string
    }
    keys: {
      [key: string]: string | undefined
    }
    ubiAddress?: string
    topupAddress?: string
  }
} = {
  [SOLANA_CHAIN_ID]: {
    url:
      "https://solana-mainnet.g.alchemy.com/v2/" +
      process.env.ALCHEMY_SERVER_API_KEY,
    nativeToken: {
      name: "Solana",
      decimals: 9,
      symbol: "SOL",
    },
    keys: {},
  },
  [SOLANA_DEVNET_CHAIN_ID]: {
    url:
      "https://solana-devnet.g.alchemy.com/v2/" +
      process.env.ALCHEMY_SERVER_API_KEY,
    nativeToken: {
      name: "Solana Devnet",
      decimals: 9,
      symbol: "SOL",
    },
    keys: {},
  },
  [ETHEREUM_CHAIN_ID]: {
    url:
      "https://eth-mainnet.g.alchemy.com/v2/" +
      process.env.ALCHEMY_SERVER_API_KEY,
    nativeToken: {
      name: "Ethereum",
      decimals: 18,
      symbol: "ETH",
    },
    keys: {},
  },
  [OPTIMISM_CHAIN_ID]: {
    url:
      "https://opt-mainnet.g.alchemy.com/v2/" +
      process.env.ALCHEMY_SERVER_API_KEY,
    nativeToken: {
      name: "Optimism",
      decimals: 18,
      symbol: "OP",
    },
    keys: {},
  },
  [BNB_CHAIN_ID]: {
    url:
      "https://bnb-mainnet.g.alchemy.com/v2/" +
      process.env.ALCHEMY_SERVER_API_KEY,
    nativeToken: {
      name: "Binance Coin",
      decimals: 18,
      symbol: "BNB",
    },
    keys: {},
  },
  [FUSE_CHAIN_ID]: {
    url: "https://explorer.fuse.io",
    nativeToken: {
      name: "Fuse",
      decimals: 18,
      symbol: "FUSE",
    },
    topupAddress: "0x01ab5966c1d742ae0cff7f14cc0f4d85156e83d9",
    keys: {
      tokentx: "",
      txlist: "",
      txlistinternal: "",
    },
  },
  [POLYGON_CHAIN_ID]: {
    url:
      "https://polygon-mainnet.g.alchemy.com/v2/" +
      process.env.ALCHEMY_SERVER_API_KEY,
    nativeToken: {
      name: "Polygon",
      decimals: 18,
      symbol: "POL",
    },
    keys: {},
  },
  [BASE_CHAIN_ID]: {
    url:
      "https://base-mainnet.g.alchemy.com/v2/" +
      process.env.ALCHEMY_SERVER_API_KEY,
    nativeToken: {
      name: "Base",
      decimals: 18,
      symbol: "BASE",
    },
    keys: {},
  },
  [CELO_CHAIN_ID]: {
    url:
      "https://celo-mainnet.g.alchemy.com/v2/" +
      process.env.ALCHEMY_SERVER_API_KEY,
    nativeToken: {
      name: "Celo",
      decimals: 18,
      symbol: "CELO",
    },
    ubiAddress: "0x43d72ff17701b2da814620735c39c620ce0ea4a1",
    topupAddress: "0x4f93fa058b03953c851efaa2e4fc5c34afdfab84",
    keys: {},
  },
  [XDC_CHAIN_ID]: {
    url: "https://api.etherscan.io/v2/",
    nativeToken: {
      name: "XDC",
      decimals: 18,
      symbol: "XDC",
    },
    keys: {
      tokentx: process.env.LEDGER_XDC_KEY1,
      txlist: process.env.LEDGER_XDC_KEY2,
      txlistinternal: process.env.LEDGER_XDC_KEY3,
    },
  },
}
