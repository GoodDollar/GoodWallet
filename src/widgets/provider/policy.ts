import {
  BASE_CHAIN_ID,
  CELO_CHAIN_ID,
  ETHEREUM_CHAIN_ID,
} from "@/chain/chain-ids"

export const WIDGET_SIGNING_METHODS = new Set([
  "personal_sign",
  "eth_sendTransaction",
])

export const WIDGET_PROVIDER_METHODS = new Set([
  "eth_accounts",
  "eth_requestAccounts",
  "eth_chainId",
  "wallet_switchEthereumChain",
  // Read-only methods used by embedded GoodWidget packages.
  "eth_getBalance",
  "eth_call",
  ...WIDGET_SIGNING_METHODS,
])

export const WIDGET_EVM_CHAIN_IDS = new Set<number>([
  ETHEREUM_CHAIN_ID,
  BASE_CHAIN_ID,
  CELO_CHAIN_ID,
])
