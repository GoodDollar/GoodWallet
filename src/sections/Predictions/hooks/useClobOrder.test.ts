// biome-ignore-all lint/suspicious/noExplicitAny: need to cast the window
import { OrderType, Side } from "@polymarket/clob-client"
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest"

// Mock React hooks
vi.mock("react", () => ({
  useState: <T>(initial: T): [T, Mock] => [initial, vi.fn()],
  useCallback: <T>(fn: T): T => fn,
}))

vi.mock("../providers/TradingProvider", () => ({
  useTrading: vi.fn(),
}))

vi.mock("./useActiveOrders", () => ({
  default: vi.fn(() => ({ mutate: vi.fn() })),
}))

vi.mock("./useUserPositions", () => ({
  default: vi.fn(() => ({ mutate: vi.fn() })),
}))

import { useTrading } from "../providers/TradingProvider"
import useActiveOrders from "./useActiveOrders"
import useClobOrder from "./useClobOrder"
import useUserPositions from "./useUserPositions"

type MockClobClient = {
  getFeeRateBps: Mock
  getPrice: Mock
  createAndPostMarketOrder: Mock
  createAndPostOrder: Mock
  cancelOrder: Mock
}

describe("useClobOrder", () => {
  let mockClobClient: MockClobClient
  let mockMutateActiveOrders: Mock
  let mockMutateUserPositions: Mock
  const walletAddress = "0x1234567890123456789012345678901234567890"

  beforeEach(() => {
    vi.clearAllMocks()

    mockClobClient = {
      getFeeRateBps: vi.fn().mockResolvedValue(1000),
      getPrice: vi.fn(),
      createAndPostMarketOrder: vi.fn(),
      createAndPostOrder: vi.fn(),
      cancelOrder: vi.fn(),
    }

    mockMutateActiveOrders = vi.fn()
    mockMutateUserPositions = vi.fn()

    vi.mocked(useTrading).mockReturnValue({ clobClient: mockClobClient } as any)
    vi.mocked(useActiveOrders).mockReturnValue({
      mutate: mockMutateActiveOrders,
    } as any)
    vi.mocked(useUserPositions).mockReturnValue({
      mutate: mockMutateUserPositions,
    } as any)
  })

  describe("submitOrder", () => {
    it("should throw if wallet is not connected", async () => {
      const { submitOrder } = useClobOrder(undefined)

      await expect(
        submitOrder({ tokenId: "1", size: 1, side: Side.BUY }),
      ).rejects.toThrow("Wallet not connected")
    })

    it("should throw if clob client is not initialized", async () => {
      vi.mocked(useTrading).mockReturnValue({ clobClient: null } as ReturnType<
        typeof useTrading
      >)
      const { submitOrder } = useClobOrder(walletAddress)

      await expect(
        submitOrder({ tokenId: "1", size: 1, side: Side.BUY }),
      ).rejects.toThrow("CLOB client not initialized")
    })

    describe("Market Orders", () => {
      beforeEach(() => {
        mockClobClient.getPrice.mockResolvedValue({ price: "0.5" })
        mockClobClient.createAndPostMarketOrder.mockResolvedValue({
          orderID: "order-id-123",
        })
      })

      it("should fetch the SELL price when placing a BUY market order", async () => {
        const { submitOrder } = useClobOrder(walletAddress)

        await submitOrder({
          tokenId: "token-123",
          size: 10,
          side: Side.BUY,
          isMarketOrder: true,
        })

        expect(mockClobClient.getPrice).toHaveBeenCalledWith(
          "token-123",
          Side.SELL,
        )
      })

      it("should fetch the BUY price when placing a SELL market order", async () => {
        const { submitOrder } = useClobOrder(walletAddress)

        await submitOrder({
          tokenId: "token-123",
          size: 10,
          side: Side.SELL,
          isMarketOrder: true,
        })

        expect(mockClobClient.getPrice).toHaveBeenCalledWith(
          "token-123",
          Side.BUY,
        )
      })

      it("should submit the market order with FOK order type and correct params", async () => {
        const { submitOrder } = useClobOrder(walletAddress)

        await submitOrder({
          tokenId: "token-123",
          size: 10,
          side: Side.BUY,
          isMarketOrder: true,
        })

        expect(mockClobClient.getFeeRateBps).toHaveBeenCalledWith("token-123")
        expect(mockClobClient.createAndPostMarketOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            tokenID: "token-123",
            amount: 10,
            side: Side.BUY,
            feeRateBps: 1000,
          }),
          { negRisk: undefined },
          OrderType.FOK,
        )
      })

      it("should return success with orderId after placing a market order", async () => {
        const { submitOrder } = useClobOrder(walletAddress)

        const result = await submitOrder({
          tokenId: "token-123",
          size: 10,
          side: Side.BUY,
          isMarketOrder: true,
        })

        expect(result).toEqual({ success: true, orderId: "order-id-123" })
      })

      it("should refresh active orders and positions after a successful market order", async () => {
        const { submitOrder } = useClobOrder(walletAddress)

        await submitOrder({
          tokenId: "token-123",
          size: 10,
          side: Side.BUY,
          isMarketOrder: true,
        })

        expect(mockMutateActiveOrders).toHaveBeenCalled()
        expect(mockMutateUserPositions).toHaveBeenCalled()
      })

      it("should throw if the fetched market price is not a number", async () => {
        mockClobClient.getPrice.mockResolvedValue({ price: "invalid" })
        const { submitOrder } = useClobOrder(walletAddress)

        await expect(
          submitOrder({
            tokenId: "1",
            size: 1,
            side: Side.BUY,
            isMarketOrder: true,
          }),
        ).rejects.toThrow("Unable to get valid market price")
      })

      it("should throw if the fetched market price is zero", async () => {
        mockClobClient.getPrice.mockResolvedValue({ price: "0" })
        const { submitOrder } = useClobOrder(walletAddress)

        await expect(
          submitOrder({
            tokenId: "1",
            size: 1,
            side: Side.BUY,
            isMarketOrder: true,
          }),
        ).rejects.toThrow("Unable to get valid market price")
      })

      it("should throw if the fetched market price is >= 1", async () => {
        mockClobClient.getPrice.mockResolvedValue({ price: "1.1" })
        const { submitOrder } = useClobOrder(walletAddress)

        await expect(
          submitOrder({
            tokenId: "1",
            size: 1,
            side: Side.BUY,
            isMarketOrder: true,
          }),
        ).rejects.toThrow("Unable to get valid market price")
      })

      it("should throw if the market price moved more than 0.05 from the expected price", async () => {
        mockClobClient.getPrice.mockResolvedValue({ price: "0.56" })
        const { submitOrder } = useClobOrder(walletAddress)

        await expect(
          submitOrder({
            tokenId: "1",
            size: 1,
            side: Side.BUY,
            isMarketOrder: true,
            price: 0.5,
          }),
        ).rejects.toThrow("Price changed since last fetch")
      })

      it("should proceed if the price movement is within the 0.05 tolerance", async () => {
        mockClobClient.getPrice.mockResolvedValue({ price: "0.55" })
        const { submitOrder } = useClobOrder(walletAddress)

        const result = await submitOrder({
          tokenId: "1",
          size: 1,
          side: Side.BUY,
          isMarketOrder: true,
          price: 0.5,
        })

        expect(result.success).toBe(true)
      })
    })

    describe("Limit Orders", () => {
      beforeEach(() => {
        mockClobClient.createAndPostOrder.mockResolvedValue({
          orderID: "limit-id-123",
        })
      })

      it("should submit the limit order with GTC order type and correct params", async () => {
        const { submitOrder } = useClobOrder(walletAddress)

        await submitOrder({
          tokenId: "token-123",
          size: 10,
          price: 0.5,
          side: Side.BUY,
          isMarketOrder: false,
        })

        expect(mockClobClient.createAndPostOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            tokenID: "token-123",
            price: 0.5,
            size: 10,
            side: Side.BUY,
            taker: "0x0000000000000000000000000000000000000000",
          }),
          { negRisk: undefined },
          OrderType.GTC,
        )
      })

      it("should return success with orderId after placing a limit order", async () => {
        const { submitOrder } = useClobOrder(walletAddress)

        const result = await submitOrder({
          tokenId: "token-123",
          size: 10,
          price: 0.5,
          side: Side.BUY,
          isMarketOrder: false,
        })

        expect(result).toEqual({ success: true, orderId: "limit-id-123" })
      })

      it("should throw if price is not provided for a limit order", async () => {
        const { submitOrder } = useClobOrder(walletAddress)

        await expect(
          submitOrder({
            tokenId: "1",
            size: 1,
            side: Side.BUY,
            isMarketOrder: false,
          }),
        ).rejects.toThrow("Price required for limit orders")
      })
    })

    describe("Error Handling", () => {
      it("should normalise insufficient balance errors to a user-friendly message", async () => {
        mockClobClient.createAndPostOrder.mockRejectedValue(
          new Error("not enough balance / allowance"),
        )
        const { submitOrder } = useClobOrder(walletAddress)

        await expect(
          submitOrder({ tokenId: "1", size: 1, price: 0.5, side: Side.BUY }),
        ).rejects.toThrow("Insufficient Funds")
      })

      it("should throw the backend error message when the response has no orderId", async () => {
        mockClobClient.createAndPostOrder.mockResolvedValue({
          error: "Backend error",
        })
        const { submitOrder } = useClobOrder(walletAddress)

        await expect(
          submitOrder({ tokenId: "1", size: 1, price: 0.5, side: Side.BUY }),
        ).rejects.toThrow("Backend error")
      })

      it("should rethrow unexpected errors unchanged", async () => {
        mockClobClient.createAndPostOrder.mockRejectedValue(
          new Error("Unknown error"),
        )
        const { submitOrder } = useClobOrder(walletAddress)

        await expect(
          submitOrder({ tokenId: "1", size: 1, price: 0.5, side: Side.BUY }),
        ).rejects.toThrow("Unknown error")
      })
    })
  })

  describe("cancelOrder", () => {
    beforeEach(() => {
      mockClobClient.cancelOrder.mockResolvedValue({ success: true })
    })

    it("should call cancelOrder with the correct orderId", async () => {
      const { cancelOrder } = useClobOrder(walletAddress)

      await cancelOrder("order-to-cancel")

      expect(mockClobClient.cancelOrder).toHaveBeenCalledWith({
        orderID: "order-to-cancel",
      })
    })

    it("should return success after cancellation", async () => {
      const { cancelOrder } = useClobOrder(walletAddress)

      const result = await cancelOrder("order-to-cancel")

      expect(result).toEqual({ success: true })
    })

    it("should refresh active orders after cancellation", async () => {
      const { cancelOrder } = useClobOrder(walletAddress)

      await cancelOrder("order-to-cancel")

      expect(mockMutateActiveOrders).toHaveBeenCalled()
    })

    it("should throw if clob client is not initialized", async () => {
      vi.mocked(useTrading).mockReturnValue({ clobClient: null } as ReturnType<
        typeof useTrading
      >)
      const { cancelOrder } = useClobOrder(walletAddress)

      await expect(cancelOrder("123")).rejects.toThrow(
        "CLOB client not initialized",
      )
    })
  })
})
