import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/chain/provider/provider", () => ({
  getChainProvider: vi.fn(),
}))

vi.mock("@/login", () => ({
  useSessionContext: vi.fn(),
}))

vi.mock("@/tokens/utils", () => ({
  mulWithTokenBalanceUsdPrice: vi.fn(),
}))

vi.mock("./form", () => ({
  useFormSnapshot: vi.fn(),
}))

vi.mock("./transaction", () => ({
  useAmountLimits: vi.fn(),
  useAmountUnits: vi.fn(),
  useSelectedTokens: vi.fn(),
  useBroadcastRequest: vi.fn(),
  useBroadcastOptions: vi.fn(),
  useGasLimit: vi.fn(),
  useIsTransactionValid: vi.fn(),
}))

vi.mock("@/stores/transactionHistoryStore", () => ({
  activityHistoryStore: {
    replacePropagatingTx: vi.fn(),
    removePropagatingTx: vi.fn(),
  },
}))

import { activityHistoryStore } from "@/stores/transactionHistoryStore"

import { handleTrxMinedOutcome } from "./evmTransaction"

describe("handleTrxMinedOutcome", () => {
  const chainId = 42220
  const initialHash = "0xinitialhash"
  const accountToken = 1

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("(a) keeps propagating entry when trxMinedPromise rejects with a generic tracking error", async () => {
    const trackingError = new Error("Transaction was not found after 5 retries")
    const trxMinedPromise = Promise.reject(trackingError)

    await handleTrxMinedOutcome(
      trxMinedPromise,
      chainId,
      initialHash,
      accountToken,
    )

    expect(activityHistoryStore.removePropagatingTx).not.toHaveBeenCalled()
  })

  it("(b) removes propagating entry when trxMinedPromise rejects with a cancellation error", async () => {
    const cancelError = Object.assign(new Error("transaction cancelled"), {
      code: "TRANSACTION_REPLACED",
      reason: "cancelled",
    })
    const trxMinedPromise = Promise.reject(cancelError)

    await handleTrxMinedOutcome(
      trxMinedPromise,
      chainId,
      initialHash,
      accountToken,
    )

    expect(activityHistoryStore.removePropagatingTx).toHaveBeenCalledWith(
      chainId,
      initialHash,
      accountToken,
    )
  })

  it("replaces propagating entry when trxMinedPromise resolves with a speed-up receipt", async () => {
    const replacementReceipt = { hash: "0xspeeduphash" }
    const trxMinedPromise = Promise.resolve(replacementReceipt)

    await handleTrxMinedOutcome(
      trxMinedPromise,
      chainId,
      initialHash,
      accountToken,
    )

    expect(activityHistoryStore.replacePropagatingTx).toHaveBeenCalledWith(
      chainId,
      initialHash,
      "0xspeeduphash",
      accountToken,
    )
  })
})
