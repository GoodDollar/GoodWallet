import type {
  TransactionRequest,
  TypedDataDomain,
  TypedDataField,
} from "ethers"
import { getBytes } from "ethers"
import { copyRequest } from "ethers/providers"

import { getViemClient } from "@/chain/provider/EVM/viemClients"
import { getEthersProvider } from "@/ethers-utils"
import type { EVMSigner } from "@/login"
import { WalletWrapper } from "@/sections/WalletConnect/utils/WalletWrapper"

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
  requestWalletApproval?: (request: WalletApprovalRequest) => Promise<boolean>
  prepareTransaction?: (
    chainId: number,
    signer: EVMSigner,
    request: TransactionRequest,
  ) => Promise<TransactionRequest>
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

const approvalTransaction = (
  request: TransactionRequest,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(request).map(([key, value]) => [
      key,
      typeof value === "bigint" ? `0x${value.toString(16)}` : value,
    ]),
  )

const normalizeError = (error: unknown): WidgetProviderError => {
  if (error instanceof WidgetProviderError) return error
  const message =
    error instanceof Error ? error.message : "Provider request failed"
  const rejected = /reject|denied|declined|cancel/i.test(message)
  return new WidgetProviderError(rejected ? 4001 : 4200, message, error)
}

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
  readonly #prepareTransaction: NonNullable<
    RestrictedProviderOptions["prepareTransaction"]
  >
  readonly #rpcRequest: NonNullable<RestrictedProviderOptions["rpcRequest"]>
  #approvalPending = false
  #chainId: number
  #revoked = false
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
    this.#requestWalletApproval =
      options.requestWalletApproval ?? (async () => false)
    this.#prepareTransaction =
      options.prepareTransaction ??
      (async (chainId, signer, request) => {
        const connectedSigner = new WalletWrapper(
          signer,
          getEthersProvider(chainId),
        )
        return await connectedSigner.populateTransaction(request)
      })
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

  get isRevoked(): boolean {
    return this.#revoked
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

  dispose(): void {
    if (this.#revoked) return
    this.#revoked = true
    this.#emit("accountsChanged", [])
    this.#listeners.clear()
  }

  async request(request: ProviderRequest): Promise<unknown> {
    this.#assertActive()
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
            const result = await this.#rpcRequest(this.#chainId, request)
            this.#assertActive()
            return result
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

  #assertActive(): void {
    if (this.#revoked) {
      throw new WidgetProviderError(4100, "The widget provider was revoked")
    }
  }

  #captureSigningContext(account: unknown): {
    signer: EVMSigner
    account: string
    chainId: number
  } {
    this.#assertActive()
    if (!addressesMatch(account, this.#signer.address)) {
      throw new WidgetProviderError(
        4100,
        "The signing account does not match the active GoodWallet session",
      )
    }
    return {
      signer: this.#signer,
      account: this.#signer.address,
      chainId: this.#chainId,
    }
  }

  #assertSigningContext(context: {
    signer: EVMSigner
    account: string
    chainId: number
  }): void {
    this.#assertActive()
    if (
      this.#signer !== context.signer ||
      !addressesMatch(this.#signer.address, context.account) ||
      this.#chainId !== context.chainId
    ) {
      throw new WidgetProviderError(
        4100,
        "The active wallet account or chain changed during approval",
      )
    }
  }

  async #requestSigningApproval(
    method: string,
    params: readonly unknown[],
    context: {
      signer: EVMSigner
      account: string
      chainId: number
    },
  ): Promise<void> {
    if (this.#approvalPending) {
      throw new WidgetProviderError(4200, "Another widget approval is pending")
    }
    this.#assertSigningContext(context)
    this.#approvalPending = true
    try {
      const approved = await this.#requestWalletApproval({
        method,
        params,
        account: context.account,
        chainId: context.chainId,
      })
      this.#assertSigningContext(context)
      if (!approved) {
        throw new WidgetProviderError(
          4001,
          "GoodWallet did not approve the signing request",
        )
      }
    } finally {
      this.#approvalPending = false
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
        4100,
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
    if (typeof message !== "string") {
      throw new WidgetProviderError(4200, "personal_sign requires a message")
    }
    const context = this.#captureSigningContext(account)
    const approvalParams = [message, context.account] as const
    await this.#requestSigningApproval("personal_sign", approvalParams, context)
    const signature = await context.signer.signMessage(
      /^0x[0-9a-f]*$/i.test(message) ? getBytes(message) : message,
    )
    this.#assertSigningContext(context)
    return signature
  }

  async #signTypedData(params: readonly unknown[]): Promise<string> {
    const [account, rawData] = params
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
    const context = this.#captureSigningContext(account)
    const { EIP712Domain: _domainType, ...types } = data.types
    if (
      data.domain.chainId !== undefined &&
      Number(data.domain.chainId) !== context.chainId
    ) {
      throw new WidgetProviderError(
        4100,
        "Typed-data chain does not match the active widget chain",
      )
    }
    const approvalParams = [context.account, rawData] as const
    await this.#requestSigningApproval(
      "eth_signTypedData_v4",
      approvalParams,
      context,
    )
    const signature = await context.signer.signTypedData(
      data.domain,
      types,
      data.message,
    )
    this.#assertSigningContext(context)
    return signature
  }

  async #sendTransaction(params: readonly unknown[]): Promise<unknown> {
    const transaction = params[0]
    if (
      !transaction ||
      typeof transaction !== "object" ||
      Array.isArray(transaction)
    ) {
      throw new WidgetProviderError(4200, "A transaction object is required")
    }
    const rawRequest = transaction as TransactionRequest & {
      from?: string
      gas?: string | number | bigint
      chainId?: string | number
    }
    const context = this.#captureSigningContext(rawRequest.from)
    if (
      rawRequest.chainId !== undefined &&
      Number(rawRequest.chainId) !== context.chainId
    ) {
      throw new WidgetProviderError(
        4100,
        "Transaction chain does not match the active widget chain",
      )
    }
    if (
      rawRequest.gas !== undefined &&
      rawRequest.gasLimit != null &&
      BigInt(rawRequest.gas) !== BigInt(rawRequest.gasLimit)
    ) {
      throw new WidgetProviderError(
        4200,
        "Transaction gas and gasLimit must match",
      )
    }
    const copiedRequest = copyRequest({
      ...rawRequest,
      chainId: context.chainId,
      gasLimit: rawRequest.gasLimit ?? rawRequest.gas,
    })
    const { from: _from, ...unsignedRequest } = copiedRequest
    const populatedRequest = copyRequest(
      await this.#prepareTransaction(
        context.chainId,
        context.signer,
        unsignedRequest,
      ),
    )
    this.#assertSigningContext(context)
    const approvalParams = [approvalTransaction(populatedRequest)] as const
    await this.#requestSigningApproval(
      "eth_sendTransaction",
      approvalParams,
      context,
    )
    const rawTransaction =
      await context.signer.signTransaction(populatedRequest)
    this.#assertSigningContext(context)
    const result = await this.#rpcRequest(context.chainId, {
      method: "eth_sendRawTransaction",
      params: [rawTransaction],
    })
    this.#assertSigningContext(context)
    return result
  }
}
