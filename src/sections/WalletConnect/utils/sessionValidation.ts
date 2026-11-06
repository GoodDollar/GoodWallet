import type { SessionTypes } from "@walletconnect/types"

import type { ISigner } from "@/login/types"

import { BIP122_TESTNET_CAIP2 } from "../data/BIP122Data"
import { SOLANA_DEVNET } from "../data/SolanaData"
import { getSupportedNamespaces } from "./supportedNamespaces"

export const isSessionCompatibleWithSigner = (
  session: SessionTypes.Struct,
  signer: ISigner,
): boolean => {
  const namespaces = session.namespaces || {}
  const supported = getSupportedNamespaces(signer)

  for (const [nsKey, data] of Object.entries(namespaces)) {
    const baseNs = nsKey.includes(":") ? nsKey.split(":")[0] : nsKey
    const supportedNs = supported[nsKey] ?? supported[baseNs]
    if (!supportedNs) {
      return false
    }

    const supportedMethods = new Set(supportedNs.methods)
    for (const method of data.methods || []) {
      if (!supportedMethods.has(method)) {
        return false
      }
    }

    if (baseNs === "eip155") {
      const evmAddress = signer.EVM?.address?.toLowerCase()
      if (!evmAddress) return false
      const supportedChains = new Set(supportedNs.chains)
      for (const account of data.accounts || []) {
        const parts = account.split(":")
        const address = parts.pop()?.toLowerCase()
        const chainId = parts.join(":")
        if (address && address !== evmAddress) {
          return false
        }
        if (chainId && !supportedChains.has(chainId)) {
          return false
        }
      }
    } else if (baseNs === "solana") {
      if (!signer.SOLANA && !signer.SOLANA_DEVNET) return false
      for (const account of data.accounts || []) {
        const parts = account.split(":")
        const address = parts.pop()
        const chainId = parts.join(":")
        const expectedAddress =
          chainId === SOLANA_DEVNET
            ? (signer.SOLANA_DEVNET?.address ?? signer.SOLANA?.address)
            : (signer.SOLANA?.address ?? signer.SOLANA_DEVNET?.address)
        if (!expectedAddress || address !== expectedAddress) {
          return false
        }
      }
    } else if (baseNs === "bip122") {
      if (!signer.BTC && !signer.BTC_TESTNET) return false
      for (const account of data.accounts || []) {
        const parts = account.split(":")
        const address = parts.pop()
        const chainId = parts.join(":")
        const expectedAddress =
          chainId === BIP122_TESTNET_CAIP2
            ? (signer.BTC_TESTNET?.address ?? signer.BTC?.address)
            : (signer.BTC?.address ?? signer.BTC_TESTNET?.address)
        if (!expectedAddress || address !== expectedAddress) {
          return false
        }
      }
    } else {
      return false
    }
  }
  return true
}
