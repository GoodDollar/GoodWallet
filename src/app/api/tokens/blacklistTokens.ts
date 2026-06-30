import { CELO_ADDRESS } from "ethers-utils"
import { CELO_CHAIN_ID, POLYGON_CHAIN_ID } from "@/chain/chain-ids"
import { NormalizedAddressMap } from "@/hooks/useTokenBalances/NormalizedAddressMap"

type ChainId = number
type Address = string

const polygonBlacklistTokens = new NormalizedAddressMap("EVM", [
  ["0x07b1d6c3f66f800a8e6274a3c5331f76e7b58c39", {}],
  ["0x191bbe4fa88617700fc9d2f29c34151f32deeab7", {}],
  ["0x825f8430d24ddd2024e7334197b7dc593193608d", {}],
  ["0x950ddb91842c58814ed4ee7077ce35632225797e", {}],
  ["0xb4e073b6030691abc0abba383aff2098d90279aa", {}],
])

//Remove the ERC20 representation of CELO-Native, so it doesn't gets displayed twice
const celoBlacklistTokens = new NormalizedAddressMap("EVM", [
  [CELO_ADDRESS, {}],
])

export const BLACKLIST_TOKENS = new Map<
  ChainId,
  NormalizedAddressMap<Address, unknown>
>([
  [POLYGON_CHAIN_ID, polygonBlacklistTokens],
  [CELO_CHAIN_ID, celoBlacklistTokens],
])
