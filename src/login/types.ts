import type * as bitcoin from "bitcoinjs-lib"
import type { Signer } from "ethers/providers"
import type { KeyPairSigner, Transaction as SolanaTransaction } from "gill"
import type { Transaction } from "xrpl"

type Address = {
  address: string
}

export type SessionType = ISignerSession["type"]

export type EVMSigner = Pick<
  Signer,
  "signTransaction" | "signMessage" | "signTypedData"
> &
  Address

export type BTCSigner = {
  signPsbt: (psbt: bitcoin.Psbt) => Promise<string>
  publicKey: string
} & Address

export type SVMSigner = Pick<KeyPairSigner, "signMessages"> & {
  // gill 0.14 narrows the signer's param to
  // `Transaction & TransactionWithinSizeLimit & TransactionWithLifetime`.
  // We sign transactions sourced externally (WalletConnect/wallet-adapter) and
  // our own; method form keeps the real gill signer assignable while preserving
  // the pre-0.14 semantics of accepting any `Transaction`.
  signTransactions(
    transactions: readonly SolanaTransaction[],
    config?: Parameters<KeyPairSigner["signTransactions"]>[1],
  ): ReturnType<KeyPairSigner["signTransactions"]>
} & Address

export type XRPSigner = {
  sign: (tx: Transaction) => Promise<{ tx_blob: string; hash: string }>
  publicKey: string
} & Address

export type ISigner = {
  EVM: EVMSigner

  BTC: BTCSigner
  BTC_TESTNET?: BTCSigner

  DOGE: BTCSigner
  DOGE_TESTNET?: BTCSigner

  SOLANA?: SVMSigner
  SOLANA_DEVNET?: SVMSigner

  XRP?: XRPSigner
  XRP_TESTNET?: XRPSigner
}

export type Addresses = Map<keyof ISigner, string>

export type ISignerSession = {
  signer: ISigner
  sessionOrigin: string
  authProvider?: string
  userName?: string
  profileImage?: string
} & (IBrowserSession | IPrivateKeySession)

type IBrowserSession = {
  type: "BROWSER"
}

type IPrivateKeySession = {
  type: "PRIVATE_KEY"
  masterSeed: string
}
