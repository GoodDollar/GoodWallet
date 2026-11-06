import { beforeEach, describe, expect, it, vi } from "vitest"

import type { BroadcastOptions, BroadcastRequest } from "./types"

// ── Hoisted mocks (available at vi.mock hoist-time) ─────────────────────────

const {
  mockAcquire,
  mockRelease,
  mockBroadcastTransaction,
  mockGetTransaction,
  mockGetTransactionCount,
  mockGetBlockNumber,
  mockSubmitReferral,
  mockSetDivviMarked,
} = vi.hoisted(() => ({
  mockAcquire: vi.fn(),
  mockRelease: vi.fn(),
  mockBroadcastTransaction: vi.fn(),
  mockGetTransaction: vi.fn(),
  mockGetTransactionCount: vi.fn(),
  mockGetBlockNumber: vi.fn(),
  mockSubmitReferral: vi.fn(),
  mockSetDivviMarked: vi.fn(),
}))

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("async-await-mutex-lock", () => ({
  Lock: class {
    acquire = mockAcquire
    release = mockRelease
  },
}))

vi.mock("./ethersProviders", () => ({
  getEthersProvider: vi.fn(() => ({
    broadcastTransaction: mockBroadcastTransaction,
    getTransaction: mockGetTransaction,
    getTransactionCount: mockGetTransactionCount,
    getBlockNumber: mockGetBlockNumber,
  })),
}))

vi.mock("@/gooddollar/methods/divvi", () => ({
  GD_DATASUFFIX: "DIVVI_SUFFIX",
  submitReferral: mockSubmitReferral,
  setDivviMarked: mockSetDivviMarked,
}))

// ── Import after mocks ─────────────────────────────────────────────────────

import { isConfirmedTxFailure, sendTx, sendTxWaitForMining } from "./utils"

// ── Helpers ─────────────────────────────────────────────────────────────────

const SIGNED_TX = "0xsignedtx"
const TX_HASH = "0xtxhash"
const DEFAULT_GAS_LIMIT = BigInt(50000)

const createSigner = () => ({
  address: "0xSender",
  signTransaction: vi.fn().mockResolvedValue(SIGNED_TX),
  signMessage: vi.fn(),
  signTypedData: vi.fn(),
})

const createRequest = (
  overrides?: Partial<BroadcastRequest>,
): BroadcastRequest => ({
  chainId: 1,
  to: "0xRecipient",
  ...overrides,
})

const createType0Options = (gasPrice = BigInt(100)): BroadcastOptions => ({
  type: 0,
  gasPrice,
})

const createType2Options = (
  maxFeePerGas = BigInt(100),
  maxPriorityFeePerGas = BigInt(10),
): BroadcastOptions => ({
  type: 2,
  maxFeePerGas,
  maxPriorityFeePerGas,
})

const createTxResponse = (hash = TX_HASH) => {
  const response = {
    hash,
    wait: vi.fn().mockResolvedValue({ hash }),
    replaceableTransaction: vi.fn(),
  }
  // By default replaceableTransaction returns a copy of itself so the tracked
  // path exercises the same wait mock as the untracked path.
  response.replaceableTransaction.mockReturnValue(response)
  return response
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("ethers-utils", () => {
  let signer: ReturnType<typeof createSigner>
  let request: BroadcastRequest
  let options: BroadcastOptions
  let txResponse: ReturnType<typeof createTxResponse>

  beforeEach(() => {
    vi.resetAllMocks()

    signer = createSigner()
    request = createRequest()
    options = createType0Options()
    txResponse = createTxResponse()

    mockAcquire.mockResolvedValue(undefined)
    mockGetTransactionCount.mockResolvedValue(0)
    mockGetBlockNumber.mockResolvedValue(100)
    mockBroadcastTransaction.mockResolvedValue(txResponse)
    mockSubmitReferral.mockResolvedValue({
      json: vi.fn().mockResolvedValue({}),
    })
  })

  // ── sendTx ──────────────────────────────────────────────────────────────

  describe("sendTx", () => {
    it("should sign, broadcast, and return the response with receipt", async () => {
      const result = await sendTxWaitForMining(
        signer as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      expect(signer.signTransaction).toHaveBeenCalled()
      expect(mockBroadcastTransaction).toHaveBeenCalledWith(SIGNED_TX)
      expect(result.txResponse.hash).toBe(TX_HASH)
      expect(result.txReceipt).toEqual({ hash: TX_HASH })
    })

    it("should acquire the lock before broadcasting and release it after", async () => {
      const callOrder: string[] = []
      mockAcquire.mockImplementation(async () => {
        callOrder.push("acquire")
      })
      mockBroadcastTransaction.mockImplementation(async () => {
        callOrder.push("broadcast")
        return txResponse
      })
      mockRelease.mockImplementation(() => {
        callOrder.push("release")
      })

      await sendTxWaitForMining(
        signer as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      expect(mockAcquire).toHaveBeenCalledWith(request.chainId)
      expect(mockRelease).toHaveBeenCalledWith(request.chainId)
      expect(callOrder).toEqual(["acquire", "broadcast", "release"])
    })

    it("should release the lock when broadcasting fails", async () => {
      mockBroadcastTransaction.mockRejectedValue(new Error("broadcast failed"))

      await expect(
        sendTxWaitForMining(
          signer as never,
          DEFAULT_GAS_LIMIT,
          request,
          options,
        ),
      ).rejects.toThrow("broadcast failed")

      expect(mockRelease).toHaveBeenCalledWith(request.chainId)
    })

    it("should use the latest nonce by default", async () => {
      mockGetTransactionCount.mockResolvedValue(5)

      await sendTxWaitForMining(
        signer as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      expect(signer.signTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ nonce: 5 }),
      )
    })

    it("should use the pending nonce when usePendingNonce is true", async () => {
      mockGetTransactionCount.mockImplementation(
        async (_addr: string, type: string) => (type === "latest" ? 5 : 8),
      )

      await sendTxWaitForMining(
        signer as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
        true,
      )

      expect(signer.signTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ nonce: 8 }),
      )
    })

    it("should double gas limit and gasPrice when replacing a pending type-0 transaction", async () => {
      mockGetTransactionCount.mockImplementation(
        async (_addr: string, type: string) => (type === "latest" ? 5 : 6),
      )
      options = createType0Options(BigInt(100))

      await sendTxWaitForMining(
        signer as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      expect(signer.signTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          gasLimit: DEFAULT_GAS_LIMIT * BigInt(2),
          gasPrice: BigInt(200),
          nonce: 5,
        }),
      )
    })

    it("should double gas limit, maxFeePerGas, and maxPriorityFeePerGas when replacing a pending type-2 transaction", async () => {
      mockGetTransactionCount.mockImplementation(
        async (_addr: string, type: string) => (type === "latest" ? 5 : 6),
      )
      options = createType2Options(BigInt(100), BigInt(10))

      await sendTxWaitForMining(
        signer as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      expect(signer.signTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          gasLimit: DEFAULT_GAS_LIMIT * BigInt(2),
          maxFeePerGas: BigInt(200),
          maxPriorityFeePerGas: BigInt(20),
          nonce: 5,
        }),
      )
    })

    it("should not modify gas fees when there is no pending transaction to replace", async () => {
      mockGetTransactionCount.mockResolvedValue(5)
      options = createType0Options(BigInt(100))

      await sendTxWaitForMining(
        signer as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      expect(signer.signTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          gasLimit: DEFAULT_GAS_LIMIT,
          gasPrice: BigInt(100),
        }),
      )
    })

    it("should submit a divvi referral when data includes GD_DATASUFFIX", async () => {
      request = createRequest({ data: "0xcalldata_DIVVI_SUFFIX" })

      await sendTxWaitForMining(
        signer as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      expect(mockSubmitReferral).toHaveBeenCalledWith({
        txHash: TX_HASH,
        chainId: request.chainId,
      })
    })

    it("should not submit a divvi referral when data does not include GD_DATASUFFIX", async () => {
      request = createRequest({ data: "0xregularcalldata" })

      await sendTxWaitForMining(
        signer as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      expect(mockSubmitReferral).not.toHaveBeenCalled()
    })

    it("should not submit a divvi referral when the receipt is null", async () => {
      txResponse.wait.mockResolvedValue(null)
      request = createRequest({ data: "0xcalldata_DIVVI_SUFFIX" })

      const result = await sendTxWaitForMining(
        signer as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      expect(result.txReceipt).toBeNull()
      expect(mockSubmitReferral).not.toHaveBeenCalled()
    })
  })

  // ── sendTxWithoutWaitingForMining ─────────────────────────────────────

  describe("sendTxWithoutWaitingForMining", () => {
    it("should return the transaction hash without awaiting the receipt", async () => {
      const result = await sendTx(
        signer as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      expect(result.hash).toBe(TX_HASH)
      expect(result.trxMinedPromise).toBeInstanceOf(Promise)
    })

    it("should resolve trxMinedPromise with the receipt once mined", async () => {
      const result = await sendTx(
        signer as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      const receipt = await result.trxMinedPromise
      expect(receipt).toEqual({ hash: TX_HASH })
    })

    it("should acquire the lock before broadcasting and release it after", async () => {
      const callOrder: string[] = []
      mockAcquire.mockImplementation(async () => {
        callOrder.push("acquire")
      })
      mockBroadcastTransaction.mockImplementation(async () => {
        callOrder.push("broadcast")
        return txResponse
      })
      mockRelease.mockImplementation(() => {
        callOrder.push("release")
      })

      await sendTx(signer as never, DEFAULT_GAS_LIMIT, request, options)

      expect(mockAcquire).toHaveBeenCalledWith(request.chainId)
      expect(mockRelease).toHaveBeenCalledWith(request.chainId)
      expect(callOrder).toEqual(["acquire", "broadcast", "release"])
    })

    it("should release the lock when broadcast fails", async () => {
      mockBroadcastTransaction.mockRejectedValue(new Error("broadcast failed"))

      await expect(
        sendTx(signer as never, DEFAULT_GAS_LIMIT, request, options),
      ).rejects.toThrow("broadcast failed")

      expect(mockRelease).toHaveBeenCalledWith(request.chainId)
    })
  })

  // ── external wallet (submitTransaction) ───────────────────────────────

  describe("external wallet", () => {
    const createWalletSigner = () => ({
      ...createSigner(),
      submitTransaction: vi.fn().mockResolvedValue(TX_HASH),
    })

    let walletSigner: ReturnType<typeof createWalletSigner>

    beforeEach(() => {
      walletSigner = createWalletSigner()
      mockGetTransaction.mockResolvedValue(txResponse)
    })

    it("sendTx submits through the wallet without signing, locking, or broadcasting", async () => {
      request = createRequest({ data: "0xcalldata" })

      const result = await sendTx(
        walletSigner as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      expect(result.hash).toBe(TX_HASH)
      expect(walletSigner.submitTransaction).toHaveBeenCalledWith({
        ...request,
        from: walletSigner.address,
        gasLimit: DEFAULT_GAS_LIMIT,
      })
      expect(walletSigner.signTransaction).not.toHaveBeenCalled()
      expect(mockAcquire).not.toHaveBeenCalled()
      expect(mockBroadcastTransaction).not.toHaveBeenCalled()
      expect(mockGetTransactionCount).not.toHaveBeenCalled()
      await expect(result.trxMinedPromise).resolves.toEqual({ hash: TX_HASH })
      expect(mockGetTransaction).toHaveBeenCalledWith(TX_HASH)
    })

    it("sendTx does not pass wallet-managed fees or nonce", async () => {
      await sendTx(walletSigner as never, DEFAULT_GAS_LIMIT, request, options)

      const submitted = walletSigner.submitTransaction.mock.calls[0][0]
      expect(submitted).not.toHaveProperty("nonce")
      expect(submitted).not.toHaveProperty("gasPrice")
      expect(submitted).not.toHaveProperty("maxFeePerGas")
    })

    it("sendTxWaitForMining returns the response and receipt and keeps divvi tracking", async () => {
      request = createRequest({ data: "0xcalldata_DIVVI_SUFFIX" })

      const result = await sendTxWaitForMining(
        walletSigner as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      expect(result.txResponse.hash).toBe(TX_HASH)
      expect(result.txReceipt).toEqual({ hash: TX_HASH })
      expect(mockBroadcastTransaction).not.toHaveBeenCalled()
      expect(mockSubmitReferral).toHaveBeenCalledWith({
        txHash: TX_HASH,
        chainId: request.chainId,
      })
    })

    it("propagates wallet rejection", async () => {
      walletSigner.submitTransaction.mockRejectedValue(
        new Error("User rejected"),
      )

      await expect(
        sendTxWaitForMining(
          walletSigner as never,
          DEFAULT_GAS_LIMIT,
          request,
          options,
        ),
      ).rejects.toThrow("User rejected")
      expect(mockBroadcastTransaction).not.toHaveBeenCalled()
    })

    it("resolves with the replacement receipt when the tx is sped up by the external wallet", async () => {
      // Simulate the external wallet submitting a speed-up: the original hash
      // is never mined; replaceableTransaction().wait() throws TRANSACTION_REPLACED.
      const replacementReceipt = { hash: "0xreplacementhash" }
      const replacedError = Object.assign(
        new Error("transaction was replaced"),
        {
          code: "TRANSACTION_REPLACED",
          reason: "speedup",
          receipt: replacementReceipt,
          replacement: { hash: "0xreplacementhash" },
        },
      )

      txResponse.replaceableTransaction.mockReturnValue({
        ...txResponse,
        wait: vi.fn().mockRejectedValue(replacedError),
      })
      mockGetTransaction.mockResolvedValue(txResponse)
      request = createRequest({ data: "0xcalldata_DIVVI_SUFFIX" })

      const result = await sendTxWaitForMining(
        walletSigner as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      // The replacement receipt is surfaced, not an error.
      expect(result.txReceipt).toEqual(replacementReceipt)
      // The replacement response (with replacement hash) is returned to callers.
      expect(result.txResponse.hash).toBe("0xreplacementhash")
      expect(result.originalTxResponse?.hash).toBe(txResponse.hash)
      // Divvi tracking uses the replacement hash.
      expect(mockSubmitReferral).toHaveBeenCalledWith({
        txHash: "0xreplacementhash",
        chainId: request.chainId,
      })
    })

    it("throws and does not submit a Divvi referral when the tx is cancelled by the external wallet", async () => {
      // "cancelled" = zero-value self-transfer: the original intent was NOT
      // executed; waitForMinedStatus must rethrow so callers surface a failure.
      const cancelReceipt = { hash: "0xcancelhash" }
      const cancelError = Object.assign(new Error("transaction was replaced"), {
        code: "TRANSACTION_REPLACED",
        reason: "cancelled",
        receipt: cancelReceipt,
        replacement: { hash: "0xcancelhash" },
      })

      txResponse.replaceableTransaction.mockReturnValue({
        ...txResponse,
        wait: vi.fn().mockRejectedValue(cancelError),
      })
      mockGetTransaction.mockResolvedValue(txResponse)
      request = createRequest({ data: "0xcalldata_DIVVI_SUFFIX" })

      await expect(
        sendTxWaitForMining(
          walletSigner as never,
          DEFAULT_GAS_LIMIT,
          request,
          options,
        ),
      ).rejects.toThrow("transaction was replaced")

      expect(mockSubmitReferral).not.toHaveBeenCalled()
    })

    it("throws and does not submit a Divvi referral when the tx is replaced with different intent by the external wallet", async () => {
      // "replaced" = different calldata/to/value: a different-intent transaction
      // mined in place of the original; waitForMinedStatus must rethrow.
      const replaceReceipt = { hash: "0xreplacehash" }
      const replaceError = Object.assign(
        new Error("transaction was replaced"),
        {
          code: "TRANSACTION_REPLACED",
          reason: "replaced",
          receipt: replaceReceipt,
          replacement: { hash: "0xreplacehash" },
        },
      )

      txResponse.replaceableTransaction.mockReturnValue({
        ...txResponse,
        wait: vi.fn().mockRejectedValue(replaceError),
      })
      mockGetTransaction.mockResolvedValue(txResponse)
      request = createRequest({ data: "0xcalldata_DIVVI_SUFFIX" })

      await expect(
        sendTxWaitForMining(
          walletSigner as never,
          DEFAULT_GAS_LIMIT,
          request,
          options,
        ),
      ).rejects.toThrow("transaction was replaced")

      expect(mockSubmitReferral).not.toHaveBeenCalled()
    })

    it("throws and does not submit a Divvi referral when a repriced replacement tx reverts on-chain (status 0)", async () => {
      const revertedReceipt = { hash: "0xreplacementhash", status: 0 }
      const revertedError = Object.assign(
        new Error("transaction was replaced and reverted"),
        {
          code: "TRANSACTION_REPLACED",
          reason: "repriced",
          receipt: revertedReceipt,
          replacement: { hash: "0xreplacementhash" },
        },
      )

      txResponse.replaceableTransaction.mockReturnValue({
        ...txResponse,
        wait: vi.fn().mockRejectedValue(revertedError),
      })
      mockGetTransaction.mockResolvedValue(txResponse)
      request = createRequest({ data: "0xcalldata_DIVVI_SUFFIX" })

      await expect(
        sendTxWaitForMining(
          walletSigner as never,
          DEFAULT_GAS_LIMIT,
          request,
          options,
        ),
      ).rejects.toThrow("transaction was replaced and reverted")

      expect(mockSubmitReferral).not.toHaveBeenCalled()
    })

    it("does not trigger a resend when getTransaction temporarily fails to find the tx", async () => {
      // Simulate RPC returning null for the first few polls then succeeding.
      mockGetTransaction
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(txResponse)

      const result = await sendTxWaitForMining(
        walletSigner as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      // No second submitTransaction call — no resend.
      expect(walletSigner.submitTransaction).toHaveBeenCalledTimes(1)
      expect(result.txResponse.hash).toBe(TX_HASH)
    })

    it("retries when getTransaction encounters transient RPC errors and resolves when it succeeds", async () => {
      // Simulate RPC throwing transient errors before returning the transaction.
      mockGetTransaction
        .mockRejectedValueOnce(new Error("RPC rate limited: 429"))
        .mockRejectedValueOnce(new Error("Network timeout"))
        .mockResolvedValue(txResponse)

      const result = await sendTxWaitForMining(
        walletSigner as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      expect(result.txResponse.hash).toBe(TX_HASH)
      expect(mockGetTransaction).toHaveBeenCalledTimes(3)
      expect(walletSigner.submitTransaction).toHaveBeenCalledTimes(1)
    })

    it("captures the start block before wallet submission so replacement tracking covers the popup window", async () => {
      const START_BLOCK = 42
      const callOrder: string[] = []
      mockGetBlockNumber.mockImplementation(async () => {
        callOrder.push("getBlockNumber")
        return START_BLOCK
      })
      walletSigner.submitTransaction.mockImplementation(async () => {
        callOrder.push("submitTransaction")
        return TX_HASH
      })
      mockGetTransaction.mockResolvedValue(txResponse)

      await sendTxWaitForMining(
        walletSigner as never,
        DEFAULT_GAS_LIMIT,
        request,
        options,
      )

      expect(callOrder).toEqual(["getBlockNumber", "submitTransaction"])
      expect(txResponse.replaceableTransaction).toHaveBeenCalledWith(
        START_BLOCK,
      )
    })
  })

  describe("isConfirmedTxFailure", () => {
    it("returns true for confirmed cancellation", () => {
      const err = Object.assign(new Error("transaction cancelled"), {
        code: "TRANSACTION_REPLACED",
        reason: "cancelled",
      })
      expect(isConfirmedTxFailure(err)).toBe(true)
    })

    it("returns true for different-intent replacement", () => {
      const err = Object.assign(new Error("transaction replaced"), {
        code: "TRANSACTION_REPLACED",
        reason: "replaced",
      })
      expect(isConfirmedTxFailure(err)).toBe(true)
    })

    it("returns true for reverted replacement transaction (status 0)", () => {
      const err = Object.assign(new Error("replacement reverted"), {
        code: "TRANSACTION_REPLACED",
        reason: "repriced",
        receipt: { status: 0 },
      })
      expect(isConfirmedTxFailure(err)).toBe(true)
    })

    it("returns true for on-chain revert CALL_EXCEPTION", () => {
      const err = Object.assign(new Error("execution reverted"), {
        code: "CALL_EXCEPTION",
        receipt: { status: 0 },
      })
      expect(isConfirmedTxFailure(err)).toBe(true)
    })

    it("returns false for uncertain errors like timeouts, network errors, or polling retry exhaustion", () => {
      expect(isConfirmedTxFailure(new Error("timeout"))).toBe(false)
      expect(
        isConfirmedTxFailure(
          new Error("Transaction was not found after 5 retries"),
        ),
      ).toBe(false)
      expect(
        isConfirmedTxFailure(
          Object.assign(new Error("network error"), { code: "NETWORK_ERROR" }),
        ),
      ).toBe(false)
    })
  })
})
