import {
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
  type SolanaSignTransactionInput,
  type SolanaSignTransactionOutput,
} from "@solana/wallet-standard-features"
import type {
  Wallet,
  WalletAccount,
  WalletIcon,
  WalletVersion,
} from "@wallet-standard/base"
import {
  type Address,
  getAddressEncoder,
  getTransactionDecoder,
  getTransactionEncoder,
  type Transaction,
} from "gill"

import type { SVMSigner } from "@/login"

// 1×1 transparent PNG, required because WalletIcon must be a data URI.
const WALLET_ICON: WalletIcon =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

const SOLANA_MAINNET_CHAIN = "solana:mainnet" as const
const FEATURES = [SolanaSignTransaction] as const

export const createSolanaWallet = (signer: SVMSigner): Wallet => {
  const address = signer.address as Address
  const publicKey = getAddressEncoder().encode(address) as Uint8Array

  const account: WalletAccount = {
    address,
    publicKey,
    chains: [SOLANA_MAINNET_CHAIN],
    features: FEATURES,
  }

  const signTransaction = async (
    ...inputs: readonly SolanaSignTransactionInput[]
  ): Promise<readonly SolanaSignTransactionOutput[]> => {
    if (inputs.length === 0) return []

    const decoder = getTransactionDecoder()
    const encoder = getTransactionEncoder()

    const decoded: Transaction[] = inputs.map((input) =>
      decoder.decode(input.transaction),
    )
    const signatureDictionaries = await signer.signTransactions(decoded)

    return decoded.map((tx, i) => {
      const signed: Transaction = {
        ...tx,
        signatures: { ...tx.signatures, ...signatureDictionaries[i] },
      }
      return { signedTransaction: new Uint8Array(encoder.encode(signed)) }
    })
  }

  const signTransactionFeature: SolanaSignTransactionFeature[typeof SolanaSignTransaction] =
    {
      version: "1.0.0",
      supportedTransactionVersions: ["legacy", 0],
      signTransaction,
    }

  return {
    version: "1.0.0" satisfies WalletVersion,
    name: "NewGoodWallet",
    icon: WALLET_ICON,
    chains: [SOLANA_MAINNET_CHAIN],
    features: {
      [SolanaSignTransaction]: signTransactionFeature,
    },
    accounts: [account],
  }
}
