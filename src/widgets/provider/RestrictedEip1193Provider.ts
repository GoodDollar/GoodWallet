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

export type WalletApprovalRequest = {
  method: string
  params: readonly unknown[]
  account: string
  chainId: number
}

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
  requiredMethods: readonly string[]
  initialChainId?: number
  /**
   * This callback belongs to GoodWallet UI, never to the widget. Its secure
   * default leaves every signing method disabled until that UI is supplied.
   */
  requestWalletApproval?: (request: WalletApprovalRequest) => Promise<boolean>
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
 * A capability-limited EIP-1193 facade over GoodWallet's active EVM session.
 * The real signer and session are private fields and cannot be retrieved by a
 * widget through this interface.
 */
export class RestrictedEip1193Provider {
  readonly #allowedChainIds: ReadonlySet<number>
  readonly #allowedMethods: ReadonlySet<string>
  readonly #listeners = new Map<
    "accountsChanged" | "chainChanged",
    Set<(...args: unknown[]) => void>
  >()
  readonly #requestWalletApproval: NonNullable<
    RestrictedProviderOptions["requestWalletApproval"]
  >
  readonly #rpcRequest: NonNullable<RestrictedProviderOptions["rpcRequest"]>
  #chainId: number
  #signer: EVMSigner

  constructor(options: RestrictedProviderOptions) {
    if (options.chainIds.length === 0) {
      throw new Error("At least one widget chain is required")
    }

    const unsupportedChains = options.chainIds.filter(
      (chainId) => !WIDGET_EVM_CHAIN_IDS.has(chainId),
    )
    if (unsupportedChains.length > 0) {
      throw new Error(
        `Widget requested unsupported chains: ${unsupportedChains.join(", ")}`,
      )
    }

    const unsupportedMethods = options.requiredMethods.filter(
      (method) => !WIDGET_PROVIDER_METHODS.has(method),
    )
    if (unsupportedMethods.length > 0) {
      throw new Error(
        `Widget requires unsupported provider methods: ${unsupportedMethods.join(", ")}`,
      )
    }

    this.#allowedChainIds = new Set(options.chainIds)
    this.#allowedMethods = new Set(options.requiredMethods)
    this.#chainId = options.initialChainId ?? options.chainIds[0]
    if (!this.#allowedChainIds.has(this.#chainId)) {
      throw new Error("The initial chain must be allowed")
    }

    this.#signer = options.signer
    // Signing is disabled unless a Wallet-owned confirmation surface opts in.
    this.#requestWalletApproval =
      options.requestWalletApproval ?? (async () => false)
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
    return [...this.#allowedMethods]
  }

  on(
    event: "accountsChanged" | "chainChanged",
    listener: (...args: unknown[]) => void,
  ): this {
    const listeners = this.#listeners.get(event) ?? new Set()
    listeners.add(listener)
    this.#listeners.set(event, listeners)
    return this
  }

  removeListener(
    event: "accountsChanged" | "chainChanged",
    listener: (...args: unknown[]) => void,
  ): this {
    this.#listeners.get(event)?.delete(listener)
    return this
  }

  /**
   * Session updates retain the facade while notifying a widget of account loss.
   */
  updateAccount(signer: EVMSigner): void {
    const accountChanged = !addressesMatch(signer.address, this.#signer.address)
    this.#signer = signer
    if (accountChanged) this.#emit("accountsChanged", [signer.address])
  }

  async request(request: ProviderRequest): Promise<unknown> {
    if (!WIDGET_PROVIDER_METHODS.has(request.method)) {
      throw new WidgetProviderError(
        4200,
        `Method ${request.method} is not permitted for widgets`,
      )
    }
    if (!this.#allowedMethods.has(request.method)) {
      throw new WidgetProviderError(
        4100,
        `Method ${request.method} is not approved for this widget`,
      )
    }

    try {
      const params = asParams(request.params)
      switch (request.method) {
        case "eth_accounts":
        case "eth_requestAccounts":
          return [this.#signer.address]
        case "eth_chainId":
          return `0x${this.#chainId.toString(16)}`
        case "wallet_switchEthereumChain":
          return this.#switchChain(params)
        case "personal_sign":
          return await this.#signMessage(params)
        case "eth_signTypedData_v4":
          return await this.#signTypedData(params)
        case "eth_sendTransaction":
          return await this.#sendTransaction(params)
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

  #emit(event: "accountsChanged" | "chainChanged", value: unknown): void {
    for (const listener of this.#listeners.get(event) ?? []) listener(value)
  }

  #assertAccount(account: unknown): void {
    if (!addressesMatch(account, this.#signer.address)) {
      throw new WidgetProviderError(
        4100,
        "The signing account does not match the active GoodWallet session",
      )
    }
  }

  async #requestSigningApproval(
    method: string,
    params: readonly unknown[],
  ): Promise<void> {
    const approved = await this.#requestWalletApproval({
      method,
      params,
      account: this.#signer.address,
      chainId: this.#chainId,
    })
    if (!approved) {
      throw new WidgetProviderError(
        4001,
        "GoodWallet did not approve the signing request",
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
    if (!this.#allowedChainIds.has(chainId)) {
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
    await this.#requestSigningApproval("personal_sign", params)
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
    if (
      data.domain.chainId !== undefined &&
      Number(data.domain.chainId) !== this.#chainId
    ) {
      throw new WidgetProviderError(
        4100,
        "Typed-data chain does not match the active widget chain",
      )
    }
    await this.#requestSigningApproval("eth_signTypedData_v4", params)
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
    await this.#requestSigningApproval("eth_sendTransaction", params)
    const { from: _from, ...signableRequest } = request
    const rawTransaction = await this.#signer.signTransaction(signableRequest)
    return await this.#rpcRequest(this.#chainId, {
      method: "eth_sendRawTransaction",
      params: [rawTransaction],
    })
  }
}
