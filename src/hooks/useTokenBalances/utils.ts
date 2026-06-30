import { isNativeToken } from "ethers-utils/utils"
import { AVAILABLE_CHAINS } from "@/chain/chains"
import { getChainProviderForFamily } from "@/chain/provider/provider"
import type { ChainFamily } from "@/chain/types"
import { config } from "@/config"
import { BITCOIN_NATIVE_ADDRESS, DOGE_NATIVE_ADDRESS } from "@/ethers-utils"
import type { BaseTokenIdentifier, ByChain } from "@/tokens/types"
import { isEqual as isEqualTokens } from "@/tokens/utils"

import { NormalizedAddressMap } from "./NormalizedAddressMap"

type ChainId = number
type Address = string

export function normalizedAddress<K extends string>(
  family: ChainFamily,
  address: K,
): string {
  switch (family) {
    case "EVM": {
      const keyWith0x = address.startsWith("0x") ? address : "0x" + address

      if (config.env !== "production") {
        const provider = getChainProviderForFamily(family)
        if (!provider.isValidAddress(keyWith0x)) {
          throw new Error(`Invalid EVM address: ${address}`)
        }
      }
      return keyWith0x.toLowerCase()
    }
    case "BTC":
    case "BTC_TESTNET":
      return BITCOIN_NATIVE_ADDRESS
    case "DOGE":
    case "DOGE_TESTNET":
      return DOGE_NATIVE_ADDRESS
    case "SOLANA":
    case "SOLANA_DEVNET": {
      if (config.env !== "production") {
        const provider = getChainProviderForFamily(family)
        if (!provider.isValidAddress(address)) {
          throw new Error(`Invalid Solana address: ${address}`)
        }
      }
      return address
    }
    default:
      //Don't normalize addresses, may be case-sensitive
      return address
  }
}

function getBy<T>(this: ByChain<T>, tokenId: BaseTokenIdentifier) {
  return this.get(tokenId.chainId)?.get(tokenId.address)
}

function getNativeBy<T>(
  this: ByChain<T>,
  tokenId: Pick<BaseTokenIdentifier, "chainId">,
) {
  return this.get(tokenId.chainId)?.native
}

export function isEqual(
  this: BaseTokenIdentifier,
  tokenB: BaseTokenIdentifier | undefined,
): boolean {
  return (tokenB && isEqualTokens(this, tokenB)) ?? false
}

export function toByChain<T, U>(
  inByChain: ReadonlyMap<ChainId, ReadonlyMap<Address, T>>,
  map: (chainId: number, address: string, a: T) => U | undefined,
): ByChain<U> {
  const byChain = new Map<
    ChainId,
    NormalizedAddressMap<Address, U> & { native: U | undefined }
  >()

  for (const [chainId, ts] of inByChain) {
    const chain = AVAILABLE_CHAINS.get(chainId)
    if (!chain) {
      continue
    }
    let native: U | undefined
    const tokensOfChain = new NormalizedAddressMap<Address, U>(chain.family)

    for (const [address, t] of ts) {
      const addressNorm = normalizedAddress(chain.family, address)
      const u = map(chainId, addressNorm, t)
      if (u !== undefined) {
        tokensOfChain.set(addressNorm, u)
      }

      if (isNativeToken(addressNorm)) {
        native = u
      }
    }

    byChain.set(chainId, Object.assign(tokensOfChain, { native }))
  }

  return Object.assign(byChain, { getBy, getNativeBy })
}
