import {
  BASE_CHAIN_ID,
  CELO_CHAIN_ID,
  ETHEREUM_CHAIN_ID,
  FUSE_CHAIN_ID,
  XDC_CHAIN_ID,
} from "@/chain/chain-ids"

export const WIDGET_PROVIDER_METHOD_LIST = [
  "eth_accounts",
  "eth_requestAccounts",
  "eth_chainId",
  "eth_getBalance",
  "eth_call",
  "wallet_switchEthereumChain",
  "personal_sign",
  "eth_sendTransaction",
] as const

export type WidgetProviderMethod = (typeof WIDGET_PROVIDER_METHOD_LIST)[number]

export const WIDGET_SIGNING_METHODS = new Set<string>([
  "personal_sign",
  "eth_sendTransaction",
])

export const WIDGET_PROVIDER_METHODS = new Set<string>(
  WIDGET_PROVIDER_METHOD_LIST,
)

export const WIDGET_EVM_CHAIN_IDS = new Set<number>([
  ETHEREUM_CHAIN_ID,
  BASE_CHAIN_ID,
  CELO_CHAIN_ID,
  FUSE_CHAIN_ID,
  XDC_CHAIN_ID,
])
