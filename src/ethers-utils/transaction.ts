import type { AddressLike } from "ethers/address"
import { Eip1559FeesNotSupportedError } from "viem"

import { CELO_CHAIN_ID, FUSE_CHAIN_ID, XDC_CHAIN_ID } from "@/chain/chain-ids"
import { getViemClient } from "@/chain/provider/EVM/viemClients"

import type { BroadcastOptions, BroadcastRequest } from "./types"

const NATIVE_TRANSFER_GAS_LIMIT = BigInt(21000)
const DEFAULT_MAX_PRIORITY_FEE_PER_GAS = BigInt(1_000_000_000) // 1 gwei
const FORCE_BASEFEE_ON_CHAIN: number[] = [
  FUSE_CHAIN_ID,
  CELO_CHAIN_ID,
  XDC_CHAIN_ID,
]

export const estimateTypeAndFees = async (
  chainId: number,
  rpcUrl?: string,
): Promise<BroadcastOptions> => {
  const client = getViemClient(chainId, rpcUrl)

  if (FORCE_BASEFEE_ON_CHAIN.includes(chainId)) {
    try {
      const baseFee = await client.getBlock()
      if (baseFee.baseFeePerGas !== null) {
        return {
          type: 2,
          maxFeePerGas:
            baseFee.baseFeePerGas + baseFee.baseFeePerGas / BigInt(8), // Add 12.5% to base fee to get max fee per gas, since these chains don't support priority fees and this is a common multiplier for max fee vs base fee on 1559 chains.
          maxPriorityFeePerGas: DEFAULT_MAX_PRIORITY_FEE_PER_GAS,
        }
      }
    } catch {
      // Ignore block lookups that fail and fall back to provider fee estimates.
    }
  }

  // Fall back to legacy getGasPrice() only when viem signals the chain doesn't
  // support EIP-1559. Any other failure (transient RPC error, etc.) is rethrown
  // so we don't silently downgrade a 1559-capable chain to legacy pricing.
  try {
    const { maxFeePerGas, maxPriorityFeePerGas } =
      await client.estimateFeesPerGas()

    return {
      type: 2,
      maxFeePerGas: maxFeePerGas,
      maxPriorityFeePerGas: maxPriorityFeePerGas,
    }
  } catch (e) {
    if (e instanceof Eip1559FeesNotSupportedError) {
      const gasPrice = await client.getGasPrice()
      return {
        type: 0,
        gasPrice,
      }
    }
    throw e
  }
}

export const estimateGasLimit = async (
  from: AddressLike,
  request: BroadcastRequest,
): Promise<bigint | null> => {
  const client = getViemClient(request.chainId)
  try {
    const estimatedGas = await client.estimateGas({
      account: from as `0x${string}`,
      to: request.to as `0x${string}`,
      data: (request.data ?? undefined) as `0x${string}` | undefined,
      value: request.value,
    })
    //If Fuse and not a simple native transfer, add 10% buffer
    if (
      request.chainId === FUSE_CHAIN_ID &&
      estimatedGas > NATIVE_TRANSFER_GAS_LIMIT
    ) {
      return (estimatedGas * BigInt(105)) / BigInt(100) //fuse sometimes underestimates gas, adding 5% buffer
    }
    return estimatedGas
  } catch (e) {
    console.warn(`estimateGas failed on chain ${request.chainId}`, e)
    return null
  }
}
