import { Icon, type IconName } from "ui"

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
} from "@/chain/chain-ids"

export const getChainIcon = (chainId: number | null): IconName => {
  if (chainId === null) return "BsGlobe"
  switch (chainId) {
    case ETHEREUM_CHAIN_ID:
    case SEPOLIA_CHAIN_ID:
    case HOODI_CHAIN_ID:
      return "ethChain"
    case OPTIMISM_CHAIN_ID:
      return "optimismChain"
    case BNB_CHAIN_ID:
      return "bnbChain"
    case FUSE_CHAIN_ID:
      return "fuseChain"
    case POLYGON_CHAIN_ID:
      return "polygonChain"
    case BASE_CHAIN_ID:
      return "baseChain"
    case CELO_CHAIN_ID:
      return "celoChain"
    case DOGE_CHAIN_ID:
    case DOGE_TESTNET_CHAIN_ID:
      return "dogeChain"
    case BITCOIN_CHAIN_ID:
    case BITCOIN_TESTNET_CHAIN_ID:
      return "bitcoinChain"
    case SOLANA_CHAIN_ID:
    case SOLANA_DEVNET_CHAIN_ID:
      return "solanaChain"
    case XDC_CHAIN_ID:
      return "xdcChain"
    case XRP_CHAIN_ID:
    case XRP_TESTNET_CHAIN_ID:
      return "xrpChain"
    default:
      return "Questionmark"
  }
}

type ChainIconProps = {
  chainId: number | null
  chainName?: string
}

export const ChainIcon = ({ chainId }: ChainIconProps) => (
  <Icon name={getChainIcon(chainId)} size="big" round />
)
