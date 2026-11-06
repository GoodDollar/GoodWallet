import { AVAILABLE_CHAINS } from "@/chain/chains"
import type { ISigner } from "@/login/types"

import {
  BIP122_CHAINS,
  BIP122_MAINNET_CAIP2,
  BIP122_SIGNING_METHODS,
  BIP122_TESTNET_CAIP2,
} from "../data/BIP122Data"
import { EIP155_CHAINS, EIP155_SIGNING_METHODS } from "../data/EIP155Data"
import { SOLANA_CHAINS, SOLANA_SIGNING_METHODS } from "../data/SolanaData"

// External wallets broadcast themselves, so raw-signing methods are not offered.
export const RAW_SIGNING_METHODS = new Set<string>([
  EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION,
  EIP155_SIGNING_METHODS.ETH_SEND_RAW_TRANSACTION,
])

export const isExternalWallet = (signer: ISigner) =>
  !!signer.EVM?.submitTransaction

export const getEip155Methods = (signer: ISigner) =>
  Object.values(EIP155_SIGNING_METHODS).filter(
    (method) => !isExternalWallet(signer) || !RAW_SIGNING_METHODS.has(method),
  )

export type SupportedNamespace = {
  chains: string[]
  methods: string[]
  events: string[]
  accounts: string[]
}

export const getSupportedNamespaces = (
  signer: ISigner,
): Record<string, SupportedNamespace> => {
  const namespaces: Record<string, SupportedNamespace> = {
    eip155: {
      chains: EIP155_CHAINS,
      methods: getEip155Methods(signer),
      events: ["accountsChanged", "chainChanged"],
      accounts: EIP155_CHAINS.map(
        (chain) => `${chain}:${signer.EVM?.address ?? ""}`,
      ),
    },
  }

  const solanaChains: string[] = []
  const solanaAccounts: string[] = []
  for (const [internalChainId, walletConnectChainId] of SOLANA_CHAINS) {
    const chain = AVAILABLE_CHAINS.get(internalChainId)
    const address = chain && signer[chain.family]?.address
    if (!address) continue
    solanaChains.push(walletConnectChainId)
    solanaAccounts.push(`${walletConnectChainId}:${address}`)
  }
  if (solanaAccounts.length > 0) {
    namespaces.solana = {
      chains: solanaChains,
      methods: Object.values(SOLANA_SIGNING_METHODS),
      events: [],
      accounts: solanaAccounts,
    }
  }

  if (signer.BTC || signer.BTC_TESTNET) {
    const bitcoinAccounts: string[] = []
    if (signer.BTC) {
      bitcoinAccounts.push(`${BIP122_MAINNET_CAIP2}:${signer.BTC.address}`)
    }
    if (signer.BTC_TESTNET) {
      bitcoinAccounts.push(
        `${BIP122_TESTNET_CAIP2}:${signer.BTC_TESTNET.address}`,
      )
    }
    namespaces.bip122 = {
      chains: Array.from(BIP122_CHAINS.values()),
      methods: Object.values(BIP122_SIGNING_METHODS),
      events: [],
      accounts: bitcoinAccounts,
    }
  }

  return namespaces
}
