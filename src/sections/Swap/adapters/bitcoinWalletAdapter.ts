import * as bitcoin from "bitcoinjs-lib"

import type { BTCSigner } from "@/login"

export type UTXOConnectorParameters = {
  shimDisconnect?: boolean
  chainId?: number
}

import type { CreateConnectorFn } from "@bigmi/client"
import {
  type Account,
  AddressType,
  type BtcRpcRequestFn,
  ChainId,
  MethodNotSupportedRpcError,
  type RpcParameters,
  type UTXOSchema,
  type UTXOWalletSchema,
} from "@bigmi/core"

export function createConnector<
  provider,
  properties extends Record<string, unknown> = Record<string, unknown>,
  storageItem extends Record<string, unknown> = Record<string, unknown>,
  createConnectorFn extends CreateConnectorFn<
    provider,
    properties,
    storageItem
  > = CreateConnectorFn<provider, properties, storageItem>,
>(createConnectorFn: createConnectorFn) {
  return createConnectorFn
}

export type UTXOWalletProvider = {
  request: BtcRpcRequestFn<UTXOWalletSchema>
}

type BitcoinConnectorProperties = {
  getAccounts(): Promise<readonly Account[]>
  onAccountsChanged(accounts: Account[]): void
  // biome-ignore lint/suspicious/noExplicitAny: <For bigmi compatibility>
  getInternalProvider(): Promise<any>
} & UTXOWalletProvider

export type ProviderRequestParams = RpcParameters<
  [...UTXOWalletSchema, ...UTXOSchema]
>

export function bitcoinAdapter(btcSigner: BTCSigner): CreateConnectorFn {
  let isConnected = false
  let internalAccounts: Account[] = []

  return createConnector<
    UTXOWalletProvider | undefined,
    BitcoinConnectorProperties
  >((config) => ({
    id: "goodwallet.btc",
    name: "Bitcoin",
    type: "UTXO",
    supportsSimulation: false,
    async connect(
      _parameters?:
        | {
            chainId?: ChainId | undefined
            isReconnecting?: boolean | undefined
          }
        | undefined,
    ) {
      internalAccounts = [
        {
          address: btcSigner.address,
          addressType: AddressType.p2wpkh,
          publicKey: btcSigner.publicKey,
          purpose: "payment",
        },
      ]

      isConnected = true
      // Emit connect event
      config.emitter.emit("connect", {
        accounts: internalAccounts,
        chainId: ChainId.BITCOIN_MAINNET,
      })

      return {
        accounts: internalAccounts,
        chainId: ChainId.BITCOIN_MAINNET,
      }
    },
    async disconnect() {
      isConnected = false
      internalAccounts = []
      config.emitter.emit("disconnect")
    },
    async getAccounts() {
      if (!isConnected) {
        throw new Error("Connector not connected")
      }
      return internalAccounts
    },
    async getChainId() {
      return ChainId.BITCOIN_MAINNET
    },
    async getInternalProvider() {
      throw new Error("Method not implemented.")
    },
    // biome-ignore lint/suspicious/noExplicitAny: <For bigmi compatibility>
    async request({ method, params }: ProviderRequestParams): Promise<any> {
      if (!isConnected) {
        throw new Error("Connector not connected")
      }

      switch (method) {
        case "signPsbt": {
          const { psbt } = params
          const btcPsbt = bitcoin.Psbt.fromHex(psbt)
          await btcSigner.signPsbt(btcPsbt)
          return btcPsbt.toHex()
        }
        default: {
          throw new MethodNotSupportedRpcError(method)
        }
      }
    },
    async getProvider() {
      if (!isConnected) {
        throw new Error("Connector not connected")
      }
      // Return the provider object that bigmi expects
      return {
        request: this.request.bind(this),
        on: config.emitter.on.bind(config.emitter),
        removeListener: config.emitter.off.bind(config.emitter),
      } as UTXOWalletProvider
    },
    async isAuthorized() {
      return isConnected
    },
    async onAccountsChanged(accounts: Account[]) {
      // Update internal accounts
      internalAccounts = accounts
      // Emit change event
      config.emitter.emit("change", { accounts })
    },
    onChainChanged(chainId: ChainId) {
      // Emit change event
      config.emitter.emit("change", { chainId })
    },
    async onDisconnect(error?: Error | undefined) {
      isConnected = false
      internalAccounts = []
      if (error) {
        config.emitter.emit("error", { error })
      }
    },
  }))
}
