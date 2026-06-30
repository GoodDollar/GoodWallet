import { beforeEach, describe, expect, it, vi } from "vitest"

import type { BroadcastOptions, BroadcastRequest } from "./types"

// ── Hoisted mocks (available at vi.mock hoist-time) ─────────────────────────

const {
  mockAcquire,
  mockRelease,
  mockBroadcastTransaction,
  mockGetTransactionCount,
  mockSubmitReferral,
  mockSetDivviMarked,
} = vi.hoisted(() => ({
  mockAcquire: vi.fn(),
  mockRelease: vi.fn(),
  mockBroadcastTransaction: vi.fn(),
  mockGetTransactionCount: vi.fn(),
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
    getTransactionCount: mockGetTransactionCount,
  })),
}))

vi.mock("@/gooddollar/methods/divvi", () => ({
  GD_DATASUFFIX: "DIVVI_SUFFIX",
  submitReferral: mockSubmitReferral,
  setDivviMarked: mockSetDivviMarked,
}))

// ── Import after mocks ─────────────────────────────────────────────────────

import { sendTx, sendTxWaitForMining } from "./utils"

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

const createTxResponse = (hash = TX_HASH) => ({
  hash,
  wait: vi.fn().mockResolvedValue({ hash }),
})

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
})
