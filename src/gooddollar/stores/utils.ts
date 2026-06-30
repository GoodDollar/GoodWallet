import { CELO_CHAIN_ID } from "@/chain/chain-ids"
import { type EncodedMethod, estimateGasLimit } from "@/ethers-utils"

import { GD_DATASUFFIX, isDivviMarked } from "../methods/divvi"

export const loadingState = {
  isLoading: true,
} as const

export const errorState = {
  isLoading: false,
  isError: true,
} as const

export const getTx = async (
  chainId: number,
  fromAddress: string,
  callData: EncodedMethod,
) => {
  const { contractAddress, data } = callData

  // append marker for divvi campaign
  const wasDivviApplied = isDivviMarked(chainId, fromAddress)
  let modifiedData = data
  if (chainId === CELO_CHAIN_ID && wasDivviApplied === false) {
    modifiedData = (data ?? "0x") + GD_DATASUFFIX
  }

  const broadcastRequest = {
    chainId,
    to: contractAddress,
    data: modifiedData,
    value: BigInt(0),
  }

  const gasLimit = await estimateGasLimit(fromAddress, broadcastRequest)
  if (!gasLimit) {
    throw new Error("Failed to estimate gas limit")
  }

  return {
    ...broadcastRequest,
    gasLimit,
  }
}
