import {
  AbstractSigner,
  defineProperties,
  type Provider,
  type TransactionRequest,
  type TypedDataDomain,
  type TypedDataField,
} from "ethers"

import type { EVMSigner } from "@/login"

export class WalletWrapper extends AbstractSigner {
  readonly address!: string

  readonly #signer: EVMSigner

  constructor(signer: EVMSigner, provider?: null | Provider) {
    super(provider)

    this.#signer = signer
    const address = signer.address
    defineProperties<WalletWrapper>(this, { address })
  }

  async getAddress(): Promise<string> {
    return this.address
  }

  connect(provider: null | Provider): WalletWrapper {
    return new WalletWrapper(this.#signer, provider)
  }

  signTransaction(tx: TransactionRequest): Promise<string> {
    return this.#signer.signTransaction(tx)
  }

  // External wallets broadcast themselves; local keys sign and broadcast here.
  async sendTransactionHash(tx: TransactionRequest): Promise<string> {
    if (this.#signer.submitTransaction) {
      return await this.#signer.submitTransaction({ ...tx, from: this.address })
    }
    return (await this.sendTransaction(tx)).hash
  }

  signMessage(message: string | Uint8Array): Promise<string> {
    return this.#signer.signMessage(message)
  }

  signTypedData(
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, unknown>,
  ): Promise<string> {
    return this.#signer.signTypedData(domain, types, value)
  }
}
