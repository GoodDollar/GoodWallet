import { defineChain } from "viem"
import {
  base,
  bsc,
  celo,
  fuse,
  hoodi,
  mainnet,
  optimism,
  polygon,
  sepolia,
  xdc,
} from "viem/chains"

import { config } from "@/config"

import {
  BASE_CHAIN_ID,
  BITCOIN_CHAIN_ID,
  BITCOIN_TESTNET_CHAIN_ID,
  BNB_CHAIN_ID,
  CELO_CHAIN_ID,
  DOGE_CHAIN_ID,
  DOGE_TESTNET_CHAIN_ID,
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
} from "./chain-ids"
import {
  BITCOIN_FAMILY,
  BITCOIN_TESTNET_FAMILY,
  type Chain,
  DOGE_FAMILY,
  DOGE_TESTNET_FAMILY,
  EVM_FAMILY,
  SOLANA_DEVNET_FAMILY,
  SOLANA_FAMILY,
  XRP_FAMILY,
  XRP_TESTNET_FAMILY,
} from "./types"

export const ETHEREUM: Chain = {
  ...mainnet,
  family: EVM_FAMILY,
  tvl: 78_000_000_000,
  blockExplorers: {
    default: {
      name: "explorer",
      url: "https://etherscan.io/",
    },
  },
}

export const OPTIMISM = {
  ...optimism,
  family: EVM_FAMILY,
  tvl: 300_000_000,
  blockExplorers: {
    default: {
      name: "explorer",
      url: "https://optimistic.etherscan.io/",
    },
  },
}

export const XDC = {
  ...xdc,
  family: EVM_FAMILY,
  tvl: 20_170_000,
  blockExplorers: {
    default: {
      name: "explorer",
      url: "https://xdcscan.com/",
    },
  },
  rpcUrls: {
    default: {
      http: ["https://xdc.public-rpc.com"],
    },
  },
}

export const BNB = {
  ...bsc,
  family: EVM_FAMILY,
  tvl: 7_000_000_000,
  blockExplorers: {
    default: {
      name: "explorer",
      url: "https://bscscan.com/",
    },
  },
}

export const FUSE = {
  ...fuse,
  family: EVM_FAMILY,
  tvl: 38_342_000,
  blockExplorers: {
    default: {
      name: "explorer",
      url: "https://explorer.fuse.io/",
    },
  },
}

export const POLYGON = {
  ...polygon,
  family: EVM_FAMILY,
  tvl: 1_227_000_000,
  blockExplorers: {
    default: {
      name: "explorer",
      url: "https://polygonscan.com/",
    },
  },
}

export const BASE = {
  ...base,
  family: EVM_FAMILY,
  tvl: 3_000_000_000,
  blockExplorers: {
    default: {
      name: "explorer",
      url: "https://basescan.org/",
    },
  },
}

export const CELO = {
  ...celo,
  family: EVM_FAMILY,
  tvl: 79_300_000,
  blockExplorers: {
    default: {
      name: "explorer",
      url: "https://celoscan.io/",
    },
  },
}

export const SEPOLIA = {
  ...sepolia,
  family: EVM_FAMILY,
  tvl: 0,
  blockExplorers: {
    default: {
      name: "explorer",
      url: "https://sepolia.etherscan.io/",
    },
  },
}

export const HOODI: Chain = {
  ...hoodi,
  family: EVM_FAMILY,
  tvl: 0,
  blockExplorers: {
    default: {
      name: "explorer",
      url: "https://explorer.hoodi.network/",
    },
  },
}

export const DOGE = {
  ...defineChain({
    id: DOGE_CHAIN_ID,
    name: "Doge",
    testnet: false,
    nativeCurrency: {
      name: "Doge",
      symbol: "DOGE",
      decimals: 8,
    },
    tvl: 0,
    rpcUrls: {
      default: {
        http: [],
      },
    },
    blockExplorers: {
      default: {
        name: "explorer",
        url: "https://blockexplorer.one/dogecoin/mainnet/",
      },
    },
  }),
  family: DOGE_FAMILY,
}

export const DOGE_TESTNET = {
  ...defineChain({
    id: DOGE_TESTNET_CHAIN_ID,
    name: "Doge Testnet",
    testnet: true,
    nativeCurrency: {
      name: "Doge",
      symbol: "DOGE",
      decimals: 8,
    },
    tvl: 0,
    rpcUrls: {
      default: {
        http: [],
      },
    },
    blockExplorers: {
      default: {
        name: "explorer",
        url: "https://blockexplorer.one/dogecoin/testnet/",
      },
    },
  }),
  family: DOGE_TESTNET_FAMILY,
}

export const BITCOIN = {
  ...defineChain({
    id: BITCOIN_CHAIN_ID,
    name: "Bitcoin",
    testnet: false,
    nativeCurrency: {
      name: "Bitcoin",
      symbol: "BTC",
      decimals: 8,
    },
    tvl: 7_134_000_000,
    rpcUrls: {
      default: {
        http: [],
      },
    },
    blockExplorers: {
      default: {
        name: "explorer",
        url: "https://mempool.space/",
      },
    },
  }),
  family: BITCOIN_FAMILY,
}

export const BITCOIN_TESTNET = {
  ...defineChain({
    id: BITCOIN_TESTNET_CHAIN_ID,
    name: "Bitcoin Testnet",
    testnet: true,
    nativeCurrency: {
      name: "Bitcoin Testnet",
      symbol: "BTC",
      decimals: 8,
    },
    tvl: 0,
    rpcUrls: {
      default: {
        http: [],
      },
    },
    blockExplorers: {
      default: {
        name: "explorer",
        url: "https://mempool.space/testnet/",
      },
    },
  }),
  family: BITCOIN_TESTNET_FAMILY,
}

export const SOLANA = {
  ...defineChain({
    id: SOLANA_CHAIN_ID,
    name: "Solana",
    testnet: false,
    nativeCurrency: {
      name: "Solana",
      symbol: "SOL",
      decimals: 9,
    },
    tvl: 9_758_000_000,
    rpcUrls: {
      default: {
        http: [],
      },
    },
    blockExplorers: {
      default: {
        name: "explorer",
        url: "https://explorer.solana.com/",
      },
    },
  }),
  family: SOLANA_FAMILY,
}

export const SOLANA_DEVNET: Chain = {
  ...defineChain({
    id: SOLANA_DEVNET_CHAIN_ID,
    name: "Solana Devnet",
    testnet: true,
    tvl: 0,
    nativeCurrency: {
      name: "Solana",
      symbol: "SOL",
      decimals: 9,
    },
    rpcUrls: {
      default: {
        http: [],
      },
    },
    blockExplorers: {
      default: {
        name: "explorer",
        url: "https://explorer.solana.com/",
      },
    },
  }),
  family: SOLANA_DEVNET_FAMILY,
}

export const XRP: Chain = {
  ...defineChain({
    tvl: 0, // TODO: modify this based on the sorting order we'll decide
    id: XRP_CHAIN_ID,
    name: "XRP",
    testnet: false,
    nativeCurrency: {
      name: "XRP",
      symbol: "XRP",
      decimals: 6,
    },
    rpcUrls: {
      default: {
        http: [],
      },
    },
    blockExplorers: {
      default: {
        name: "explorer",
        url: "https://xrpscan.com/ledger/",
      },
    },
  }),
  family: XRP_FAMILY,
}

export const XRP_TESTNET: Chain = {
  ...defineChain({
    id: XRP_TESTNET_CHAIN_ID,
    name: "XRP Testnet",
    testnet: true,
    tvl: 0,
    nativeCurrency: {
      name: "XRP",
      symbol: "XRP",
      decimals: 6,
    },
    rpcUrls: {
      default: {
        http: [],
      },
    },
    blockExplorers: {
      default: {
        name: "explorer",
        url: "https://testnet.xrpl.org/",
      },
    },
  }),
  family: XRP_TESTNET_FAMILY,
}

export const toExplorerUrl = (txHash: string, chainId: number | undefined) => {
  return openExplorer(`tx/${txHash}`, chainId)
}

export const openContractInExplorer = (
  address: string,
  chainId: number | undefined,
) => {
  if (!chainId) {
    throw new Error("ChainId cannot be null")
  }
  const chain = ALL.get(chainId)
  // For non-EVM chains, just open the base explorer (address lookup may not work)
  if (chain?.family !== EVM_FAMILY) {
    return chain?.blockExplorers?.default.url ?? ""
  }
  return openExplorer(`address/${address}`, chainId)
}

const openExplorer = (path: string, chainId: number | undefined) => {
  if (!chainId) {
    throw new Error("ChainId cannot be null")
  }
  const url = `${ALL.get(chainId)?.blockExplorers?.default.url}${path}`
  if (chainId === SOLANA_DEVNET_CHAIN_ID) {
    return `${url}?cluster=devnet`
  }

  return url
}

export const ALL = Object.freeze(
  new Map<number, Chain>([
    [ETHEREUM_CHAIN_ID, ETHEREUM],
    [OPTIMISM_CHAIN_ID, OPTIMISM],
    [BNB_CHAIN_ID, BNB],
    [XDC_CHAIN_ID, XDC],
    [FUSE_CHAIN_ID, FUSE],
    [POLYGON_CHAIN_ID, POLYGON],
    [CELO_CHAIN_ID, CELO],
    [SEPOLIA_CHAIN_ID, SEPOLIA],
    [HOODI_CHAIN_ID, HOODI],
    [BASE_CHAIN_ID, BASE],
    [DOGE_CHAIN_ID, DOGE],
    [DOGE_TESTNET_CHAIN_ID, DOGE_TESTNET],
    [BITCOIN_CHAIN_ID, BITCOIN],
    [BITCOIN_TESTNET_CHAIN_ID, BITCOIN_TESTNET],
    [SOLANA_CHAIN_ID, SOLANA],
    [SOLANA_DEVNET_CHAIN_ID, SOLANA_DEVNET],
    [XRP_CHAIN_ID, XRP],
    [XRP_TESTNET_CHAIN_ID, XRP_TESTNET],
  ]),
)

const MAINNETS = new Map<number, Chain>(
  Array.from(ALL).filter(([, chain]) => !chain.testnet),
)

export const AVAILABLE_CHAINS = config.includeTestnetTokens ? ALL : MAINNETS
export const AVAILABLE_EVM_CHAINS = new Map<number, Chain>(
  Array.from(AVAILABLE_CHAINS).filter(
    ([, chain]) => chain.family === EVM_FAMILY,
  ),
)
export const AVAILABLE_CHAINS_IDS = Array.from(AVAILABLE_CHAINS.values())
  .sort((a, b) => b.tvl - a.tvl)
  .map((c) => c.id)

export const getChainName = (chainId: number): string => {
  const chain = AVAILABLE_CHAINS.get(chainId)

  if (!chain) {
    throw new Error(`Chain ID '${chainId}' is not supported`)
  }
  return chain.name
}
