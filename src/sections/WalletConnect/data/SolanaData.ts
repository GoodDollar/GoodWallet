/**
 * Chains
 */
import { SOLANA_CHAIN_ID, SOLANA_DEVNET_CHAIN_ID } from "@/chain/chain-ids"
import { AVAILABLE_CHAINS_IDS } from "@/chain/chains"

export const SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
export const SOLANA_DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"

export const SOLANA_CHAINS = new Map<number, string>([
  [SOLANA_CHAIN_ID, SOLANA_MAINNET],
])
if (AVAILABLE_CHAINS_IDS.includes(SOLANA_DEVNET_CHAIN_ID)) {
  SOLANA_CHAINS.set(SOLANA_DEVNET_CHAIN_ID, SOLANA_DEVNET)
}

/**
 * Methods
 */
export const SOLANA_SIGNING_METHODS = {
  SOLANA_SIGN_TRANSACTION: "solana_signTransaction",
  SOLANA_SIGN_MESSAGE: "solana_signMessage",
}
