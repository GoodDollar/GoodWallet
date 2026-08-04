import type {
  TransactionRequest,
  TypedDataDomain,
  TypedDataField,
} from "ethers"
import { getBytes } from "ethers"

import { getViemClient } from "@/chain/provider/EVM/viemClients"
import type { EVMSigner } from "@/login"

import {
  WIDGET_EVM_CHAIN_IDS,
  WIDGET_PROVIDER_METHODS,
  WIDGET_READ_METHODS,
} from "./policy"

export type ProviderRequest = {
  method: string
  params?: readonly unknown[] | Record<string, unknown>
}

export type ProviderEvent = "accountsChanged" | "chainChanged"
type ProviderListener = (...args: unknown[]) => void

export class WidgetProviderError extends Error {
  constructor(
    public readonly code: 4001 | 4100 | 4200 | 4901,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message)
    this.name = "WidgetProviderError"
  }
}

export type RestrictedProviderOptions = {
  signer: EVMSigner
  chainIds: readonly number[]
  requiredMethods?: readonly string[]
  initialChainId?: number
  rpcRequest?: (chainId: number, request: ProviderRequest) => Promise<unknown>
}

const asParams = (params: ProviderRequest["params"]): readonly unknown[] =>
  Array.isArray(params) ? params : []

const asChainId = (value: unknown): number => {
  if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) {
    throw new WidgetProviderError(4200, "Invalid hexadecimal chain ID")
  }
  return Number.parseInt(value, 16)
}

const addressesMatch = (left: unknown, right: string): boolean =>
  typeof left === "string" && left.toLowerCase() === right.toLowerCase()

const normalizeError = (error: unknown): WidgetProviderError => {
  if (error instanceof WidgetProviderError) return error
  const message =
    error instanceof Error ? error.message : "Provider request failed"
  const rejected = /reject|denied|declined|cancel/i.test(message)
  return new WidgetProviderError(rejected ? 4001 : 4200, message, error)
}

/**
 * Capability-limited EIP-1193 facade over the active GoodWallet signer.
 *
 * Widgets execute on the wallet origin, so they receive only this method and
 * chain allowlist—not the signer, seed, or an unrestricted RPC provider.
 */
export class RestrictedEip1193Provider {
  readonly #allowedChainIds: ReadonlySet<number>
  readonly #listeners = new Map<ProviderEvent, Set<ProviderListener>>()
  readonly #rpcRequest: NonNullable<RestrictedProviderOptions["rpcRequest"]>
  #chainId: number
  #signer: EVMSigner

  constructor(options: RestrictedProviderOptions) {
    if (options.chainIds.length === 0) {
      throw new Error("At least one widget chain is required")
    }
    this.#allowedChainIds = new Set(options.chainIds)
    this.#chainId = options.initialChainId ?? options.chainIds[0]
    if (!this.#allowedChainIds.has(this.#chainId)) {
      throw new Error("The initial chain must be allowed")
    }
    for (const chainId of this.#allowedChainIds) {
      if (!WIDGET_EVM_CHAIN_IDS.has(chainId)) {
        throw new Error(`Widget requested unsupported chain ${chainId}`)
      }
    }
    const unsupportedMethods = (options.requiredMethods ?? []).filter(
      (method) => !WIDGET_PROVIDER_METHODS.has(method),
    )
    if (unsupportedMethods.length > 0) {
      throw new Error(
        `Widget requires unsupported provider methods: ${unsupportedMethods.join(", ")}`,
      )
    }
    this.#signer = options.signer
    // Read RPC is selected by the adapter's active, validated chain. A widget
    // cannot smuggle an alternate network through the request payload.
    this.#rpcRequest =
      options.rpcRequest ??
      (async (chainId, request) => {
        const client = getViemClient(chainId)
        return await (
          client.request as (request: ProviderRequest) => Promise<unknown>
        )(request)
      })
  }

  get chainId(): number {
    return this.#chainId
  }

  get supportedMethods(): readonly string[] {
    return [...WIDGET_PROVIDER_METHODS]
  }

  on(event: ProviderEvent, listener: ProviderListener): this {
    const listeners = this.#listeners.get(event) ?? new Set()
    listeners.add(listener)
    this.#listeners.set(event, listeners)
    return this
  }

  removeListener(event: ProviderEvent, listener: ProviderListener): this {
    this.#listeners.get(event)?.delete(listener)
    return this
  }

  updateAccount(signer: EVMSigner): void {
    if (addressesMatch(signer.address, this.#signer.address)) {
      this.#signer = signer
      return
    }
    this.#signer = signer
    this.#emit("accountsChanged", [signer.address])
  }

  async request(request: ProviderRequest): Promise<unknown> {
    // Reject before dispatch so adding a handler cannot accidentally expose a
    // method that maintainers have not admitted to the central policy.
    if (!WIDGET_PROVIDER_METHODS.has(request.method)) {
      throw new WidgetProviderError(
        4200,
        `Method ${request.method} is not permitted for widgets`,
      )
    }

    try {
      switch (request.method) {
        case "eth_accounts":
        case "eth_requestAccounts":
          return [this.#signer.address]
        case "eth_chainId":
          return `0x${this.#chainId.toString(16)}`
        case "wallet_switchEthereumChain":
          return this.#switchChain(asParams(request.params))
        case "personal_sign":
          return await this.#signMessage(asParams(request.params))
        case "eth_signTypedData_v4":
          return await this.#signTypedData(asParams(request.params))
        case "eth_sendTransaction":
          return await this.#sendTransaction(asParams(request.params))
        default:
          if (WIDGET_READ_METHODS.has(request.method)) {
            return await this.#rpcRequest(this.#chainId, request)
          }
          throw new WidgetProviderError(4200, "Unsupported widget request")
      }
    } catch (error) {
      throw normalizeError(error)
    }
  }

  #emit(event: ProviderEvent, value: unknown): void {
    for (const listener of this.#listeners.get(event) ?? []) listener(value)
  }

  #assertAccount(account: unknown): void {
    // Every signing path calls this check to prevent a widget from authorizing
    // requests for an account other than the active custodial session.
    if (!addressesMatch(account, this.#signer.address)) {
      throw new WidgetProviderError(
        4100,
        "The signing account does not match the active GoodWallet session",
      )
    }
  }

  #switchChain(params: readonly unknown[]): null {
    const requested = params[0]
    const rawChainId =
      requested && typeof requested === "object" && "chainId" in requested
        ? requested.chainId
        : undefined
    const chainId = asChainId(rawChainId)
    if (
      !this.#allowedChainIds.has(chainId) ||
      !WIDGET_EVM_CHAIN_IDS.has(chainId)
    ) {
      throw new WidgetProviderError(
        4901,
        `Chain ${chainId} is not allowed for this widget`,
      )
    }
    if (chainId !== this.#chainId) {
      this.#chainId = chainId
      this.#emit("chainChanged", `0x${chainId.toString(16)}`)
    }
    return null
  }

  async #signMessage(params: readonly unknown[]): Promise<string> {
    const [message, account] = params
    this.#assertAccount(account)
    if (typeof message !== "string") {
      throw new WidgetProviderError(4200, "personal_sign requires a message")
    }
    return await this.#signer.signMessage(
      /^0x[0-9a-f]*$/i.test(message) ? getBytes(message) : message,
    )
  }

  async #signTypedData(params: readonly unknown[]): Promise<string> {
    const [account, rawData] = params
    this.#assertAccount(account)
    if (typeof rawData !== "string") {
      throw new WidgetProviderError(
        4200,
        "eth_signTypedData_v4 requires JSON typed data",
      )
    }
    const data = JSON.parse(rawData) as {
      domain?: TypedDataDomain
      types?: Record<string, TypedDataField[]>
      message?: Record<string, unknown>
    }
    if (!data.domain || !data.types || !data.message) {
      throw new WidgetProviderError(4200, "Invalid EIP-712 typed data")
    }
    const { EIP712Domain: _domainType, ...types } = data.types
    const domainChainId = data.domain.chainId
    // Binding EIP-712 data to the adapter's chain prevents cross-chain signing
    // when the request and current provider state disagree.
    if (
      domainChainId !== undefined &&
      Number(domainChainId) !== this.#chainId
    ) {
      throw new WidgetProviderError(
        4100,
        "Typed-data chain does not match the active widget chain",
      )
    }
    return await this.#signer.signTypedData(data.domain, types, data.message)
  }

  async #sendTransaction(params: readonly unknown[]): Promise<unknown> {
    const transaction = params[0]
    if (!transaction || typeof transaction !== "object") {
      throw new WidgetProviderError(4200, "A transaction object is required")
    }
    const request = transaction as TransactionRequest & {
      from?: string
      chainId?: string | number
    }
    this.#assertAccount(request.from)
    if (
      request.chainId !== undefined &&
      Number(request.chainId) !== this.#chainId
    ) {
      throw new WidgetProviderError(
        4100,
        "Transaction chain does not match the active widget chain",
      )
    }
    const { from: _from, ...signableRequest } = request
    // Sign inside the wallet boundary and submit only the serialized result;
    // the underlying signer is never handed to widget code.
    const rawTransaction = await this.#signer.signTransaction(signableRequest)
    return await this.#rpcRequest(this.#chainId, {
      method: "eth_sendRawTransaction",
      params: [rawTransaction],
    })
  }
}
