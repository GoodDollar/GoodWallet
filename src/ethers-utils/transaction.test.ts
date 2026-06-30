import { Eip1559FeesNotSupportedError } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CELO_CHAIN_ID } from "@/chain/chain-ids"

const {
  mockEstimateFeesPerGas,
  mockGetBlock,
  mockGetGasPrice,
  mockGetViemClient,
} = vi.hoisted(() => ({
  mockEstimateFeesPerGas: vi.fn(),
  mockGetBlock: vi.fn(),
  mockGetGasPrice: vi.fn(),
  mockGetViemClient: vi.fn(),
}))

vi.mock("@/chain/provider/EVM/viemClients", () => ({
  getViemClient: (...args: unknown[]) =>
    mockGetViemClient(...args) ?? {
      getBlock: mockGetBlock,
      estimateFeesPerGas: mockEstimateFeesPerGas,
      getGasPrice: mockGetGasPrice,
    },
}))

import { estimateTypeAndFees } from "./transaction"

describe("estimateTypeAndFees", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetBlock.mockResolvedValue({
      baseFeePerGas: BigInt(10_000_000_000),
    })
    mockEstimateFeesPerGas.mockResolvedValue({
      gasPrice: BigInt(10_000_000_000),
      maxFeePerGas: BigInt(20_000_000_000),
      maxPriorityFeePerGas: BigInt(1_000_000_000),
    })
    mockGetGasPrice.mockResolvedValue(BigInt(10_000_000_000))
    mockGetViemClient.mockReturnValue({
      getBlock: mockGetBlock,
      estimateFeesPerGas: mockEstimateFeesPerGas,
      getGasPrice: mockGetGasPrice,
    })
  })

  it("returns legacy gas price when the chain doesn't support EIP-1559", async () => {
    mockGetBlock.mockRejectedValue(new Error("no block"))
    mockEstimateFeesPerGas.mockRejectedValue(new Eip1559FeesNotSupportedError())
    mockGetGasPrice.mockResolvedValue(BigInt(15_000_000_000))

    const result = await estimateTypeAndFees(CELO_CHAIN_ID)

    expect(result).toEqual({
      type: 0,
      gasPrice: BigInt(15_000_000_000),
    })
  })

  it("rethrows non-EIP-1559 errors from estimateFeesPerGas", async () => {
    mockGetBlock.mockRejectedValue(new Error("no block"))
    mockEstimateFeesPerGas.mockRejectedValue(new Error("RPC timeout"))

    await expect(estimateTypeAndFees(CELO_CHAIN_ID)).rejects.toThrow(
      "RPC timeout",
    )
    expect(mockGetGasPrice).not.toHaveBeenCalled()
  })

  it("returns EIP-1559 fees derived from the current base fee", async () => {
    const result = await estimateTypeAndFees(CELO_CHAIN_ID)

    expect(result).toEqual({
      type: 2,
      maxFeePerGas: BigInt(11_250_000_000),
      maxPriorityFeePerGas: BigInt(1_000_000_000),
    })
  })

  it("falls back to estimateFeesPerGas when baseFeePerGas is null", async () => {
    mockGetBlock.mockResolvedValue({
      baseFeePerGas: null,
    })

    const result = await estimateTypeAndFees(CELO_CHAIN_ID)

    expect(result).toEqual({
      type: 2,
      maxFeePerGas: BigInt(20_000_000_000),
      maxPriorityFeePerGas: BigInt(1_000_000_000),
    })
  })

  it("propagates getGasPrice errors on legacy chains", async () => {
    mockGetBlock.mockRejectedValue(new Error("no block"))
    mockEstimateFeesPerGas.mockRejectedValue(new Eip1559FeesNotSupportedError())
    mockGetGasPrice.mockRejectedValue(new Error("no gas price"))

    await expect(estimateTypeAndFees(CELO_CHAIN_ID)).rejects.toThrow(
      "no gas price",
    )
  })
})
