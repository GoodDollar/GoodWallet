import { useCallback, useState } from "react"
import type { UserMarketOrder, UserOrder } from "@polymarket/clob-client"
import { OrderType, Side } from "@polymarket/clob-client"

import { useTrading } from "../providers/TradingProvider"
import useActiveOrders from "./useActiveOrders"
import useUserPositions from "./useUserPositions"

export type OrderParams = {
  tokenId: string
  size: number
  price?: number
  side: Side
  negRisk?: boolean
  isMarketOrder?: boolean
}

export default function useClobOrder(walletAddress: string | undefined) {
  const { clobClient } = useTrading()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const { mutate: mutateUserPositions } = useUserPositions(walletAddress)
  const { mutate: mutateActiveOrders } = useActiveOrders(
    clobClient,
    walletAddress,
  )

  const submitOrder = useCallback(
    async (params: OrderParams) => {
      if (!walletAddress) {
        throw new Error("Wallet not connected")
      }
      if (!clobClient) {
        throw new Error("CLOB client not initialized")
      }

      setIsSubmitting(true)
      setError(null)
      setOrderId(null)

      try {
        const feeRateBps = await clobClient.getFeeRateBps(params.tokenId)
        let response

        if (params.isMarketOrder) {
          // For market orders, use createAndPostMarketOrder with FOK
          // BUY orders need amount in dollars
          // Get the ask price (price to buy at)
          const priceResponse = await clobClient.getPrice(
            params.tokenId,
            params.side === "BUY" ? Side.SELL : Side.BUY,
          )
          const askPrice = parseFloat(priceResponse.price)

          if (isNaN(askPrice) || askPrice <= 0 || askPrice >= 1) {
            throw new Error("Unable to get valid market price")
          }

          if (params.price && askPrice > params.price + 0.05) {
            throw new Error("Price changed since last fetch")
          }

          const marketOrder: UserMarketOrder = {
            tokenID: params.tokenId,
            amount: params.size,
            side: params.side,
            feeRateBps,
          }

          response = await clobClient.createAndPostMarketOrder(
            marketOrder,
            { negRisk: params.negRisk },
            OrderType.FOK, // Fill or Kill for market orders
          )
        } else {
          // For limit orders, use createAndPostOrder with GTC
          if (!params.price) {
            throw new Error("Price required for limit orders")
          }

          const limitOrder: UserOrder = {
            tokenID: params.tokenId,
            price: params.price,
            size: params.size,
            side: params.side,
            feeRateBps,
            expiration: 0,
            taker: "0x0000000000000000000000000000000000000000",
          }

          response = await clobClient.createAndPostOrder(
            limitOrder,
            { negRisk: params.negRisk },
            OrderType.GTC, // Good Till Cancelled for limit orders
          )
        }

        if (response.orderID) {
          setOrderId(response.orderID)
          mutateActiveOrders()
          mutateUserPositions()
          return { success: true, orderId: response.orderID }
        } else {
          throw new Error(response.error)
        }
      } catch (err: unknown) {
        let error =
          err instanceof Error ? err : new Error("Failed to submit order")
        if (error.message === "not enough balance / allowance") {
          error = new Error("Insufficient Funds")
        }
        console.error("[predictions] order submit failed", {
          tokenId: params.tokenId,
          isMarketOrder: params.isMarketOrder,
          size: params.size,
          price: params.price,
          message: error.message,
          err,
        })
        setError(error)
        throw error
      } finally {
        setIsSubmitting(false)
      }
    },
    [clobClient, walletAddress, mutateActiveOrders],
  )

  const cancelOrder = useCallback(
    async (orderId: string) => {
      if (!clobClient) {
        throw new Error("CLOB client not initialized")
      }

      setIsSubmitting(true)
      setError(null)

      try {
        await clobClient.cancelOrder({ orderID: orderId })
        mutateActiveOrders()
        return { success: true }
      } catch (err: unknown) {
        const error =
          err instanceof Error ? err : new Error("Failed to cancel order")
        setError(error)
        throw error
      } finally {
        setIsSubmitting(false)
      }
    },
    [clobClient, walletAddress, mutateActiveOrders],
  )

  return {
    submitOrder,
    cancelOrder,
    isSubmitting,
    error,
    orderId,
  }
}
