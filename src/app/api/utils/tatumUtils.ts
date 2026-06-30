import type { SUPPORTED_UTXO_FAMILIES } from "@/chain/provider/Bitcoin/types"
import {
  BITCOIN_FAMILY,
  BITCOIN_TESTNET_FAMILY,
  DOGE_FAMILY,
  DOGE_TESTNET_FAMILY,
} from "@/chain/types"

export const getChainName = (family: SUPPORTED_UTXO_FAMILIES) => {
  switch (family) {
    case BITCOIN_FAMILY:
    case BITCOIN_TESTNET_FAMILY:
      return "bitcoin"
    case DOGE_FAMILY:
    case DOGE_TESTNET_FAMILY:
      return "dogecoin"
  }
}
