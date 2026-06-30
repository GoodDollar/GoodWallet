import type { BytesLike } from "ethers"
import type { Contract } from "ethers/contract"
import type {
  AbstractProvider,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
} from "ethers/providers"
import { type BigNumberish, FixedNumber, formatUnits } from "ethers/utils"

import {
  GD_DATASUFFIX,
  setDivviMarked,
  submitReferral,
} from "@/gooddollar/methods/divvi"
import type { EVMSigner } from "@/login/types"

import {
  BITCOIN_NATIVE_ADDRESS,
  CELO_ADDRESS,
  DOGE_NATIVE_ADDRESS,
  SOLANA_NATIVE_ADDRESS,
  XRP_NATIVE_ADDRESS,
  ZERO_ADDRESS,
} from "./constants"
import { getEthersProvider } from "./ethersProviders"
import type {
  BroadcastOptions,
  BroadcastRequest,
  BroadcastResult,
  EncodedMethod,
} from "./types"

export { formatUnits }

import { Lock } from "async-await-mutex-lock"

const lock = new Lock<number>()

export const encodeMethodCall = async (
  contract: Contract,
  method: string,
  args: unknown[],
): Promise<EncodedMethod> => {
  const contractAddress = await contract.getAddress()
  const data = contract.interface.encodeFunctionData(method, args)

  return { contractAddress, data }
}
const replacementFeeMultipler = BigInt(2)
export const sendTx = async (
  signer: EVMSigner,
  gasLimit: bigint,
  broadcastRequest: BroadcastRequest,
  broadcastOptions: BroadcastOptions,
  usePendingNonce: boolean = false,
): Promise<{
  hash: string
  trxMinedPromise: Promise<TransactionReceipt | null>
}> => {
  const from = signer.address
  const provider = getEthersProvider(broadcastRequest.chainId)
  await lock.acquire(broadcastRequest.chainId)
  try {
    const { signedTx } = await prepareTx(
      provider,
      from,
      usePendingNonce,
      gasLimit,
      broadcastOptions,
      signer,
      broadcastRequest,
    )
    const trx = await provider.broadcastTransaction(signedTx)
    const trxMinedPromise = waitForMinedStatus(trx, broadcastRequest, signer)
    return { hash: trx.hash, trxMinedPromise }
  } finally {
    lock.release(broadcastRequest.chainId)
  }
}
export const sendTxWaitForMining = async (
  signer: EVMSigner,
  gasLimit: bigint,
  broadcastRequest: BroadcastRequest,
  broadcastOptions: BroadcastOptions,
  usePendingNonce: boolean = false,
): Promise<BroadcastResult> => {
  const from = signer.address
  const provider = getEthersProvider(broadcastRequest.chainId)
  await lock.acquire(broadcastRequest.chainId)
  try {
    const { signedTx } = await prepareTx(
      provider,
      from,
      usePendingNonce,
      gasLimit,
      broadcastOptions,
      signer,
      broadcastRequest,
    )

    const txResponse = await provider.broadcastTransaction(signedTx)
    console.info("sendTx got response", { txResponse })

    const txReceipt = await waitForMinedStatus(
      txResponse,
      broadcastRequest,
      signer,
    )

    console.info("sendTx got receipt", { txReceipt })
    return { txResponse, txReceipt }
  } finally {
    lock.release(broadcastRequest.chainId)
  }
}

async function waitForMinedStatus(
  txResponse: TransactionResponse,
  broadcastRequest: BroadcastRequest,
  signer: EVMSigner,
) {
  const txReceipt = await txResponse.wait()

  // send marker to divvi and mark as done
  if (broadcastRequest.data?.includes(GD_DATASUFFIX) && txReceipt?.hash) {
    submitReferral({
      txHash: txReceipt.hash,
      chainId: broadcastRequest.chainId,
    })
      .then(async (_) => {
        console.info("divvi success", await _.json())
        setDivviMarked(broadcastRequest.chainId, signer.address)
      })
      .catch((error) => {
        console.error("divvi failed", { error })
      })
  }
  return txReceipt
}

async function prepareTx(
  provider: AbstractProvider,
  from: string,
  usePendingNonce: boolean,
  gasLimit: bigint,
  broadcastOptions: BroadcastOptions,
  signer: EVMSigner,
  broadcastRequest: BroadcastRequest,
) {
  const currentNonce = await provider.getTransactionCount(from, "latest")
  const mempoolNonce = await provider.getTransactionCount(from, "pending")
  //Increase gasPrice by 20% for replacement transactions
  if (!usePendingNonce && currentNonce < mempoolNonce) {
    console.log("Replacing pending transaction with double gas fees and limits")
    gasLimit *= replacementFeeMultipler
    switch (broadcastOptions.type) {
      case 0:
        broadcastOptions.gasPrice *= replacementFeeMultipler
        break
      case 2:
        broadcastOptions.maxFeePerGas *= replacementFeeMultipler
        broadcastOptions.maxPriorityFeePerGas *= replacementFeeMultipler
        break
    }
  }

  const signedTx = await signTransaction(
    signer,
    usePendingNonce ? mempoolNonce : currentNonce,
    gasLimit,
    broadcastRequest,
    broadcastOptions,
  )
  return { signedTx, gasLimit }
}

const signTransaction = async (
  signer: EVMSigner,
  nonce: number,
  gasLimit: bigint,
  request: BroadcastRequest,
  options: BroadcastOptions,
): Promise<string> => {
  const txRequest: TransactionRequest = {
    ...request,
    ...options,
    gasLimit,
    nonce,
  }

  return await signer.signTransaction(txRequest)
}

export const isNativeToken = (address?: string) =>
  !address ||
  [
    ZERO_ADDRESS,
    CELO_ADDRESS,
    SOLANA_NATIVE_ADDRESS,
    BITCOIN_NATIVE_ADDRESS,
    DOGE_NATIVE_ADDRESS,
    XRP_NATIVE_ADDRESS,
  ].some((tokenAddress) => isSameAddress(address, tokenAddress))

export const isSameAddress = (address1: string, address2: string): boolean =>
  0 === address1.localeCompare(address2, undefined, { sensitivity: "base" })

export const isAmountSafe = (
  amount: string | number,
  decimals?: number,
): boolean => {
  try {
    parseAmount(amount, decimals)
    return true
  } catch {
    return false
  }
}

const DEFAULT_DECIMALS = 36
const WIDTH = 256

/**
 * Throws if amount is not safe
 */
export const parseAmount = (
  amount: BigNumberish,
  decimals?: number,
  signed: boolean = false,
): FixedNumber => {
  if (decimals === undefined) {
    return FixedNumber.fromString(amount.toString(), {
      width: WIDTH,
      decimals: DEFAULT_DECIMALS,
      signed,
    })
  } else {
    return FixedNumber.fromValue(amount, decimals, {
      width: WIDTH,
      decimals: DEFAULT_DECIMALS,
      signed,
    })
  }
}

/**
 * Throws if amount is not safe
 */
export const parseAmountBytes = (
  amount: BytesLike,
  decimals?: number,
  signed: boolean = false,
) => {
  return FixedNumber.fromBytes(amount, {
    decimals,
    width: WIDTH,
    signed,
  }).toFormat({ decimals: DEFAULT_DECIMALS, width: WIDTH, signed })
}
