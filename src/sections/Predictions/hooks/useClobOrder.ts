import { useCallback, useState } from "react"
import {
  type OrderResponseErrorCode,
  OrderSide,
  OrderType,
} from "@polymarket/client"

import { useTrading } from "../providers/TradingProvider"
import useActiveOrders from "./useActiveOrders"
import useUserPositions from "./useUserPositions"

// @polymarket/client exports this enum as a type but not as a runtime value, and
// @polymarket/bindings - where the value lives - is documented as not for direct
// use. So match the code by the literal the wire actually carries.
const INSUFFICIENT_BALANCE =
  "insufficient_balance_or_allowance" as OrderResponseErrorCode

export type OrderParams = {
  tokenId: string
  // BUY market orders spend this many dollars; everything else sells or bids for
  // this many shares.
  size: number
  price?: number
  side: OrderSide
  isMarketOrder?: boolean
}

export default function useClobOrder(walletAddress: string | undefined) {
  const { client } = useTrading()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const { mutate: mutateUserPositions } = useUserPositions(walletAddress)
  const { mutate: mutateActiveOrders } = useActiveOrders(client, walletAddress)

  const submitOrder = useCallback(
    async (params: OrderParams) => {
      if (!walletAddress) {
        throw new Error("Wallet not connected")
      }
      if (!client) {
        throw new Error("Polymarket client not initialized")
      }

      setIsSubmitting(true)
      setError(null)
      setOrderId(null)

      try {
        // Tick size, neg-risk status, fees and the signing details are all
        // resolved by the SDK per order, so none of them are passed in here.
        let response

        if (params.isMarketOrder) {
          // Quote against the other side of the book - the price we would have
          // to cross to get filled.
          const quote = await client.fetchPrice({
            tokenId: params.tokenId,
            side:
              params.side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY,
          })
          const askPrice = parseFloat(quote)

          if (isNaN(askPrice) || askPrice <= 0 || askPrice >= 1) {
            throw new Error("Unable to get valid market price")
          }

          if (params.price && askPrice > params.price + 0.05) {
            throw new Error("Price changed since last fetch")
          }

          response = await client.placeMarketOrder(
            params.side === OrderSide.BUY
              ? {
                  tokenId: params.tokenId,
                  side: OrderSide.BUY,
                  amount: params.size,
                  orderType: OrderType.FOK,
                }
              : {
                  tokenId: params.tokenId,
                  side: OrderSide.SELL,
                  shares: params.size,
                  orderType: OrderType.FOK,
                },
          )
        } else {
          if (!params.price) {
            throw new Error("Price required for limit orders")
          }

          // Omitting `expiration` makes this Good-Til-Cancelled.
          response = await client.placeLimitOrder({
            tokenId: params.tokenId,
            price: params.price,
            size: params.size,
            side: params.side,
          })
        }

        if (!response.ok) {
          throw new Error(
            response.code === INSUFFICIENT_BALANCE
              ? "Insufficient Funds"
              : response.message,
          )
        }

        setOrderId(response.orderId)
        mutateActiveOrders()
        mutateUserPositions()
        return { success: true, orderId: response.orderId }
      } catch (err: unknown) {
        const error =
          err instanceof Error ? err : new Error("Failed to submit order")
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
    [client, walletAddress, mutateActiveOrders, mutateUserPositions],
  )

  const cancelOrder = useCallback(
    async (orderId: string) => {
      if (!client) {
        throw new Error("Polymarket client not initialized")
      }

      setIsSubmitting(true)
      setError(null)

      try {
        await client.cancelOrder({ orderId })
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
    [client, mutateActiveOrders],
  )

  return {
    submitOrder,
    cancelOrder,
    isSubmitting,
    error,
    orderId,
  }
}
