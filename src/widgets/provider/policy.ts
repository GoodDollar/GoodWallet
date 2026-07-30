import {
  BASE_CHAIN_ID,
  BNB_CHAIN_ID,
  CELO_CHAIN_ID,
  ETHEREUM_CHAIN_ID,
  FUSE_CHAIN_ID,
  HOODI_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  POLYGON_CHAIN_ID,
  SEPOLIA_CHAIN_ID,
  XDC_CHAIN_ID,
} from "@/chain/chain-ids"

export const WIDGET_READ_METHODS = new Set([
  "eth_blockNumber",
  "eth_call",
  "eth_estimateGas",
  "eth_feeHistory",
  "eth_gasPrice",
  "eth_getBalance",
  "eth_getBlockByHash",
  "eth_getBlockByNumber",
  "eth_getBlockTransactionCountByHash",
  "eth_getBlockTransactionCountByNumber",
  "eth_getCode",
  "eth_getLogs",
  "eth_getStorageAt",
  "eth_getTransactionByHash",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_maxPriorityFeePerGas",
  "net_version",
])

export const WIDGET_SIGNING_METHODS = new Set([
  "personal_sign",
  "eth_signTypedData_v4",
  "eth_sendTransaction",
])

export const WIDGET_PROVIDER_METHODS = new Set([
  "eth_accounts",
  "eth_requestAccounts",
  "eth_chainId",
  "wallet_switchEthereumChain",
  ...WIDGET_READ_METHODS,
  ...WIDGET_SIGNING_METHODS,
])

export const WIDGET_EVM_CHAIN_IDS = new Set<number>([
  ETHEREUM_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  XDC_CHAIN_ID,
  BNB_CHAIN_ID,
  FUSE_CHAIN_ID,
  POLYGON_CHAIN_ID,
  BASE_CHAIN_ID,
  CELO_CHAIN_ID,
  SEPOLIA_CHAIN_ID,
  HOODI_CHAIN_ID,
])
