import type { BytesLike } from "ethers"
import type { Contract } from "ethers/contract"
import type {
  AbstractProvider,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
} from "ethers/providers"
import {
  type BigNumberish,
  FixedNumber,
  formatUnits,
  isError,
} from "ethers/utils"

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
const SUBMITTED_TX_POLL_MS = 1500
const SUBMITTED_TX_MAX_ATTEMPTS = 40

const getSubmittedTransaction = async (
  provider: AbstractProvider,
  hash: string,
  startBlock: number,
): Promise<{ txResponse: TransactionResponse; startBlock: number }> => {
  for (let attempt = 0; attempt < SUBMITTED_TX_MAX_ATTEMPTS; attempt++) {
    try {
      const txResponse = await provider.getTransaction(hash)
      if (txResponse) return { txResponse, startBlock }
    } catch (err) {
      if (attempt === SUBMITTED_TX_MAX_ATTEMPTS - 1) {
        throw err
      }
    }
    await new Promise((resolve) => setTimeout(resolve, SUBMITTED_TX_POLL_MS))
  }
  throw new Error(`Transaction ${hash} was not found on chain`)
}

// The wallet picks nonce and fees and broadcasts once; we only track the hash.
const submitWithWallet = async (
  submit: NonNullable<EVMSigner["submitTransaction"]>,
  signer: EVMSigner,
  gasLimit: bigint,
  broadcastRequest: BroadcastRequest,
) => {
  const provider = getEthersProvider(broadcastRequest.chainId)
  // Capture startBlock before calling submit so replacement tracking covers the
  // window while the user confirms the transaction in the wallet popup.
  const startBlock = await provider.getBlockNumber()
  const hash = await submit({
    ...broadcastRequest,
    from: signer.address,
    gasLimit,
  })
  // getSubmittedTransaction resolves with both the response and the block at
  // which we started watching; both are needed for replacement tracking.
  const txInfo = getSubmittedTransaction(provider, hash, startBlock)
  return { hash, txInfo }
}

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
  if (signer.submitTransaction) {
    const { hash, txInfo } = await submitWithWallet(
      signer.submitTransaction,
      signer,
      gasLimit,
      broadcastRequest,
    )
    const trxMinedPromise = txInfo.then(async ({ txResponse, startBlock }) => {
      const { txReceipt } = await waitForMinedStatus(
        txResponse,
        startBlock,
        broadcastRequest,
        signer,
      )
      return txReceipt
    })
    return { hash, trxMinedPromise }
  }

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
    // broadcastTransaction returns a response with replacement tracking already
    // set up by ethers; pass undefined for startBlock to use that tracking.
    const trx = await provider.broadcastTransaction(signedTx)
    const trxMinedPromise = waitForMinedStatus(
      trx,
      undefined,
      broadcastRequest,
      signer,
    ).then((res) => res.txReceipt)
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
  if (signer.submitTransaction) {
    const submitted = await submitWithWallet(
      signer.submitTransaction,
      signer,
      gasLimit,
      broadcastRequest,
    )
    const { txResponse, startBlock } = await submitted.txInfo
    const { txReceipt, replacementTxResponse } = await waitForMinedStatus(
      txResponse,
      startBlock,
      broadcastRequest,
      signer,
    )
    const effectiveResponse = replacementTxResponse ?? txResponse
    return {
      txResponse: effectiveResponse,
      txReceipt,
      ...(replacementTxResponse && { originalTxResponse: txResponse }),
    }
  }

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

    // broadcastTransaction already attaches replacement tracking; pass undefined.
    const { txReceipt, replacementTxResponse } = await waitForMinedStatus(
      txResponse,
      undefined,
      broadcastRequest,
      signer,
    )

    console.info("sendTx got receipt", { txReceipt })
    const effectiveResponse = replacementTxResponse ?? txResponse
    return {
      txResponse: effectiveResponse,
      txReceipt,
      ...(replacementTxResponse && { originalTxResponse: txResponse }),
    }
  } finally {
    lock.release(broadcastRequest.chainId)
  }
}

async function waitForMinedStatus(
  txResponse: TransactionResponse,
  startBlock: number | undefined,
  broadcastRequest: BroadcastRequest,
  signer: EVMSigner,
): Promise<{
  txReceipt: TransactionReceipt | null
  replacementTxResponse?: TransactionResponse
}> {
  // When startBlock is provided the response came from provider.getTransaction()
  // and does not carry ethers' built-in replacement tracking. Enable it so that
  // a speed-up or cancellation submitted by an external wallet resolves here
  // rather than hanging until the original hash is eventually dropped.
  const tracked =
    startBlock !== undefined
      ? txResponse.replaceableTransaction(startBlock)
      : txResponse

  let txReceipt: TransactionReceipt | null
  let replacementTxResponse: TransactionResponse | undefined
  try {
    txReceipt = await tracked.wait()
  } catch (err) {
    // TRANSACTION_REPLACED is thrown when a replacement tx mines with the same
    // nonce.  Ethers distinguishes three reasons:
    //
    //  "repriced"  — same calldata/to/value at a higher fee (speed-up). The
    //                replacement carries the original intent, so we use its
    //                receipt and continue with Divvi tracking.
    //
    //  "cancelled" — zero-value self-transfer with empty calldata. The original
    //                transaction's intent was NOT executed; rethrowing lets
    //                callers surface a failure to the user.
    //
    //  "replaced"  — different calldata/to/value (different intent). Same as
    //                "cancelled": the original payload was not executed, so we
    //                rethrow rather than presenting the replacement as success.
    if (isError(err, "TRANSACTION_REPLACED")) {
      console.info("waitForMinedStatus: transaction replaced", {
        reason: err.reason,
        hash: err.replacement?.hash,
      })
      if (err.reason === "cancelled" || err.reason === "replaced") {
        // "cancelled" (zero-value self-transfer) or "replaced" (different intent):
        // the original transaction's intent was NOT executed. Rethrow so callers'
        // error paths surface failure to the user; Divvi referral is not reached.
        throw err
      }
      if (err.receipt?.status === 0) {
        // The replacement transaction reverted on-chain (status 0). Treat as
        // a reverted transaction: rethrow so caller surfaces failure and Divvi
        // tracking is not reached.
        throw err
      }
      // "repriced" (speed-up): same intent executed at higher fee; use receipt.
      txReceipt = err.receipt ?? null
      replacementTxResponse = err.replacement
    } else {
      throw err
    }
  }

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
  return { txReceipt, replacementTxResponse }
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
