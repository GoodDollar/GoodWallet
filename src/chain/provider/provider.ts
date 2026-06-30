import { AVAILABLE_CHAINS } from "../chains"
import {
  BITCOIN_FAMILY,
  BITCOIN_TESTNET_FAMILY,
  type Chain,
  type ChainFamily,
  DOGE_FAMILY,
  DOGE_TESTNET_FAMILY,
  EVM_FAMILY,
  SOLANA_DEVNET_FAMILY,
  SOLANA_FAMILY,
  XRP_FAMILY,
  XRP_TESTNET_FAMILY,
} from "../types"
import { getBitcoinProvider } from "./Bitcoin/bitcoinProvider"
import type { BitcoinProvider } from "./Bitcoin/types"
import { getEVMProvider } from "./EVM/evmProvider"
import type { EVMProvider } from "./EVM/types"
import { getSolanaProvider } from "./Solana/solanaProvider"
import type { SolanaProvider } from "./Solana/types"
import type { XRPProvider } from "./XRP/types"
import { getXrpProvider } from "./XRP/xrpProvider"

const evmChain: EVMProvider = getEVMProvider()

const bitcoinChain: BitcoinProvider = getBitcoinProvider(BITCOIN_FAMILY)
const bitcoinTestnetChain: BitcoinProvider = getBitcoinProvider(
  BITCOIN_TESTNET_FAMILY,
)
const dogeChain: BitcoinProvider = getBitcoinProvider(DOGE_FAMILY)
const dogeTestnetChain: BitcoinProvider =
  getBitcoinProvider(DOGE_TESTNET_FAMILY)

const solanaChain: SolanaProvider = getSolanaProvider(SOLANA_FAMILY)
const solanaDevnetChain: SolanaProvider =
  getSolanaProvider(SOLANA_DEVNET_FAMILY)

const xrpChain: XRPProvider = getXrpProvider(XRP_FAMILY)
const xrpTestnetChain: XRPProvider = getXrpProvider(XRP_TESTNET_FAMILY)

export const getChainProvider = (chainId: number | Chain) => {
  let family: ChainFamily
  if (typeof chainId === "number") {
    const chain = AVAILABLE_CHAINS.get(chainId)
    if (!chain) {
      throw new Error(`Chain ID '${chainId}' is not supported`)
    }
    family = chain.family
  } else {
    family = chainId.family
  }

  return getChainProviderForFamily(family)
}

export const getChainProviderForFamily = (family: ChainFamily) => {
  switch (family) {
    case EVM_FAMILY:
      return evmChain
    case BITCOIN_FAMILY:
      return bitcoinChain
    case BITCOIN_TESTNET_FAMILY:
      return bitcoinTestnetChain
    case DOGE_FAMILY:
      return dogeChain
    case DOGE_TESTNET_FAMILY:
      return dogeTestnetChain
    case SOLANA_FAMILY:
      return solanaChain
    case SOLANA_DEVNET_FAMILY:
      return solanaDevnetChain
    case XRP_FAMILY:
      return xrpChain
    case XRP_TESTNET_FAMILY:
      return xrpTestnetChain
    default:
      throw new Error(`Chain family '${family}' is not supported!`)
  }
}
