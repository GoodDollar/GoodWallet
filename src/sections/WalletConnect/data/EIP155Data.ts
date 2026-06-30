import { AVAILABLE_EVM_CHAINS } from "@/chain/chains"

/**
 * Chains
 */
export const EIP155_CHAINS = Array.from(AVAILABLE_EVM_CHAINS.keys()).map(
  (chainId) => `eip155:${chainId}`,
)
/**
 * Methods
 */
export const EIP155_SIGNING_METHODS = {
  PERSONAL_SIGN: "personal_sign",
  ETH_SIGN_TRANSACTION: "eth_signTransaction",
  ETH_SIGN_TYPED_DATA: "eth_signTypedData",
  ETH_SIGN_TYPED_DATA_V3: "eth_signTypedData_v3",
  ETH_SIGN_TYPED_DATA_V4: "eth_signTypedData_v4",
  ETH_SEND_RAW_TRANSACTION: "eth_sendRawTransaction",
  ETH_SEND_TRANSACTION: "eth_sendTransaction",
}
