// biome-ignore-all lint/suspicious/noExplicitAny: need to cast the window
import { OrderSide, OrderType } from "@polymarket/client"
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

type MockSecureClient = {
  fetchPrice: Mock
  placeMarketOrder: Mock
  placeLimitOrder: Mock
  cancelOrder: Mock
}

describe("useClobOrder", () => {
  let mockClient: MockSecureClient
  let mockMutateActiveOrders: Mock
  let mockMutateUserPositions: Mock
  const walletAddress = "0x1234567890123456789012345678901234567890"

  beforeEach(() => {
    vi.clearAllMocks()

    mockClient = {
      fetchPrice: vi.fn(),
      placeMarketOrder: vi.fn(),
      placeLimitOrder: vi.fn(),
      cancelOrder: vi.fn(),
    }

    mockMutateActiveOrders = vi.fn()
    mockMutateUserPositions = vi.fn()

    vi.mocked(useTrading).mockReturnValue({ client: mockClient } as any)
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
        submitOrder({ tokenId: "1", size: 1, side: OrderSide.BUY }),
      ).rejects.toThrow("Wallet not connected")
    })

    it("should throw if the polymarket client is not initialized", async () => {
      vi.mocked(useTrading).mockReturnValue({ client: null } as any)
      const { submitOrder } = useClobOrder(walletAddress)

      await expect(
        submitOrder({ tokenId: "1", size: 1, side: OrderSide.BUY }),
      ).rejects.toThrow("Polymarket client not initialized")
    })

    describe("Market Orders", () => {
      beforeEach(() => {
        mockClient.fetchPrice.mockResolvedValue("0.5")
        mockClient.placeMarketOrder.mockResolvedValue({
          ok: true,
          orderId: "order-id-123",
        })
      })

      it("should fetch the SELL price when placing a BUY market order", async () => {
        const { submitOrder } = useClobOrder(walletAddress)

        await submitOrder({
          tokenId: "token-123",
          size: 10,
          side: OrderSide.BUY,
          isMarketOrder: true,
        })

        expect(mockClient.fetchPrice).toHaveBeenCalledWith({
          tokenId: "token-123",
          side: OrderSide.SELL,
        })
      })

      it("should fetch the BUY price when placing a SELL market order", async () => {
        const { submitOrder } = useClobOrder(walletAddress)

        await submitOrder({
          tokenId: "token-123",
          size: 10,
          side: OrderSide.SELL,
          isMarketOrder: true,
        })

        expect(mockClient.fetchPrice).toHaveBeenCalledWith({
          tokenId: "token-123",
          side: OrderSide.BUY,
        })
      })

      it("should send a BUY market order as a dollar amount", async () => {
        const { submitOrder } = useClobOrder(walletAddress)

        await submitOrder({
          tokenId: "token-123",
          size: 10,
          side: OrderSide.BUY,
          isMarketOrder: true,
        })

        expect(mockClient.placeMarketOrder).toHaveBeenCalledWith({
          tokenId: "token-123",
          side: OrderSide.BUY,
          amount: 10,
          orderType: OrderType.FOK,
        })
      })

      it("should send a SELL market order as a share count", async () => {
        const { submitOrder } = useClobOrder(walletAddress)

        await submitOrder({
          tokenId: "token-123",
          size: 10,
          side: OrderSide.SELL,
          isMarketOrder: true,
        })

        expect(mockClient.placeMarketOrder).toHaveBeenCalledWith({
          tokenId: "token-123",
          side: OrderSide.SELL,
          shares: 10,
          orderType: OrderType.FOK,
        })
      })

      it("should return success with orderId after placing a market order", async () => {
        const { submitOrder } = useClobOrder(walletAddress)

        const result = await submitOrder({
          tokenId: "token-123",
          size: 10,
          side: OrderSide.BUY,
          isMarketOrder: true,
        })

        expect(result).toEqual({ success: true, orderId: "order-id-123" })
      })

      it("should refresh active orders and positions after a successful market order", async () => {
        const { submitOrder } = useClobOrder(walletAddress)

        await submitOrder({
          tokenId: "token-123",
          size: 10,
          side: OrderSide.BUY,
          isMarketOrder: true,
        })

        expect(mockMutateActiveOrders).toHaveBeenCalled()
        expect(mockMutateUserPositions).toHaveBeenCalled()
      })

      it("should throw if the fetched market price is not a number", async () => {
        mockClient.fetchPrice.mockResolvedValue("invalid")
        const { submitOrder } = useClobOrder(walletAddress)

        await expect(
          submitOrder({
            tokenId: "1",
            size: 1,
            side: OrderSide.BUY,
            isMarketOrder: true,
          }),
        ).rejects.toThrow("Unable to get valid market price")
      })

      it("should throw if the fetched market price is zero", async () => {
        mockClient.fetchPrice.mockResolvedValue("0")
        const { submitOrder } = useClobOrder(walletAddress)

        await expect(
          submitOrder({
            tokenId: "1",
            size: 1,
            side: OrderSide.BUY,
            isMarketOrder: true,
          }),
        ).rejects.toThrow("Unable to get valid market price")
      })

      it("should throw if the fetched market price is >= 1", async () => {
        mockClient.fetchPrice.mockResolvedValue("1.1")
        const { submitOrder } = useClobOrder(walletAddress)

        await expect(
          submitOrder({
            tokenId: "1",
            size: 1,
            side: OrderSide.BUY,
            isMarketOrder: true,
          }),
        ).rejects.toThrow("Unable to get valid market price")
      })

      it("should throw if the market price moved more than 0.05 from the expected price", async () => {
        mockClient.fetchPrice.mockResolvedValue("0.56")
        const { submitOrder } = useClobOrder(walletAddress)

        await expect(
          submitOrder({
            tokenId: "1",
            size: 1,
            side: OrderSide.BUY,
            isMarketOrder: true,
            price: 0.5,
          }),
        ).rejects.toThrow("Price changed since last fetch")
      })

      it("should proceed if the price movement is within the 0.05 tolerance", async () => {
        mockClient.fetchPrice.mockResolvedValue("0.55")
        const { submitOrder } = useClobOrder(walletAddress)

        const result = await submitOrder({
          tokenId: "1",
          size: 1,
          side: OrderSide.BUY,
          isMarketOrder: true,
          price: 0.5,
        })

        expect(result.success).toBe(true)
      })
    })

    describe("Limit Orders", () => {
      beforeEach(() => {
        mockClient.placeLimitOrder.mockResolvedValue({
          ok: true,
          orderId: "limit-id-123",
        })
      })

      it("should submit the limit order with the tokenId, price, size and side", async () => {
        const { submitOrder } = useClobOrder(walletAddress)

        await submitOrder({
          tokenId: "token-123",
          size: 10,
          price: 0.5,
          side: OrderSide.BUY,
          isMarketOrder: false,
        })

        // No expiration means Good-Til-Cancelled; tick size, neg risk and fees
        // are all resolved by the SDK.
        expect(mockClient.placeLimitOrder).toHaveBeenCalledWith({
          tokenId: "token-123",
          price: 0.5,
          size: 10,
          side: OrderSide.BUY,
        })
      })

      it("should return success with orderId after placing a limit order", async () => {
        const { submitOrder } = useClobOrder(walletAddress)

        const result = await submitOrder({
          tokenId: "token-123",
          size: 10,
          price: 0.5,
          side: OrderSide.BUY,
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
            side: OrderSide.BUY,
            isMarketOrder: false,
          }),
        ).rejects.toThrow("Price required for limit orders")
      })
    })

    describe("Error Handling", () => {
      it("should normalise insufficient balance rejections to a user-friendly message", async () => {
        mockClient.placeLimitOrder.mockResolvedValue({
          ok: false,
          code: "insufficient_balance_or_allowance" as const,
          message: "not enough balance / allowance",
        })
        const { submitOrder } = useClobOrder(walletAddress)

        await expect(
          submitOrder({
            tokenId: "1",
            size: 1,
            price: 0.5,
            side: OrderSide.BUY,
          }),
        ).rejects.toThrow("Insufficient Funds")
      })

      it("should throw the venue's message for any other rejection", async () => {
        mockClient.placeLimitOrder.mockResolvedValue({
          ok: false,
          code: "market_not_ready" as const,
          message: "Backend error",
        })
        const { submitOrder } = useClobOrder(walletAddress)

        await expect(
          submitOrder({
            tokenId: "1",
            size: 1,
            price: 0.5,
            side: OrderSide.BUY,
          }),
        ).rejects.toThrow("Backend error")
      })

      it("should rethrow unexpected errors unchanged", async () => {
        mockClient.placeLimitOrder.mockRejectedValue(new Error("Unknown error"))
        const { submitOrder } = useClobOrder(walletAddress)

        await expect(
          submitOrder({
            tokenId: "1",
            size: 1,
            price: 0.5,
            side: OrderSide.BUY,
          }),
        ).rejects.toThrow("Unknown error")
      })
    })
  })

  describe("cancelOrder", () => {
    beforeEach(() => {
      mockClient.cancelOrder.mockResolvedValue({ success: true })
    })

    it("should call cancelOrder with the correct orderId", async () => {
      const { cancelOrder } = useClobOrder(walletAddress)

      await cancelOrder("order-to-cancel")

      expect(mockClient.cancelOrder).toHaveBeenCalledWith({
        orderId: "order-to-cancel",
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

    it("should throw if the polymarket client is not initialized", async () => {
      vi.mocked(useTrading).mockReturnValue({ client: null } as any)
      const { cancelOrder } = useClobOrder(walletAddress)

      await expect(cancelOrder("123")).rejects.toThrow(
        "Polymarket client not initialized",
      )
    })
  })
})
