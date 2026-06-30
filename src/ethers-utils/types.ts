import type { AddressLike } from "ethers/address"
import type { Contract } from "ethers/contract"
import type { TransactionReceipt, TransactionResponse } from "ethers/providers"

export type ContractFactory = (chainId: number) => Promise<Contract>

export type EncodedMethod = {
  contractAddress: AddressLike
  data: null | string
}

export type BroadcastRequest = {
  chainId: number
  to: AddressLike
  data?: null | string
  value?: bigint
}

export type BroadcastOptions =
  | {
      type: 0
      gasPrice: bigint
    }
  | {
      type: 2
      maxFeePerGas: bigint
      maxPriorityFeePerGas: bigint
    }

export type BroadcastResult = {
  txResponse: TransactionResponse
  txReceipt: TransactionReceipt | null
}

export type RpcUrls = Record<string, string>
export type VercelStorage = {
  baseUrl: string
}
