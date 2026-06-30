import type { ChainProvider, EVM_FAMILY } from "@/chain/types"

export type EVMProvider = ChainProvider & {
  family: typeof EVM_FAMILY
}
