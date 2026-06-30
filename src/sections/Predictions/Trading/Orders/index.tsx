"use client"

import { useState } from "react"
import { createToast, updateToast } from "ui"

import EmptyState from "../../components/EmptyState.tsx"
import ErrorState from "../../components/ErrorState.tsx"
import LoadingState from "../../components/LoadingState.tsx"
import useActiveOrders from "../../hooks/useActiveOrders.ts"
import useClobOrder from "../../hooks/useClobOrder.ts"
import { useTrading } from "../../providers/TradingProvider.tsx"
import OrderCard from "./OrderCard.tsx"

export default function ActiveOrders() {
  const { clobClient, safeAddress } = useTrading()
  const {
    data: orders,
    isLoading,
    error,
  } = useActiveOrders(clobClient, safeAddress as `0x${string}` | undefined)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const { cancelOrder, isSubmitting } = useClobOrder(
    safeAddress as `0x${string}` | undefined,
  )

  const handleCancelOrder = async (orderId: string) => {
    setCancellingId(orderId)
    const notId = createToast({
      message: "Canceling order",
      status: "pending",
    })
    try {
      await cancelOrder(orderId)
      updateToast({
        id: notId,
        status: "success",
        message: "Order canceled",
        autoClose: true,
      })
    } catch (err) {
      console.error("Failed to cancel order:", err)
      updateToast({
        id: notId,
        status: "error",
        message: "Failed to cancel order",
        autoClose: true,
      })
    } finally {
      setCancellingId(null)
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading open orders..." />
  }

  if (error) {
    return <ErrorState error={error} title="Error loading orders" />
  }

  if (!orders || orders.length === 0) {
    return (
      <EmptyState
        title="No Open Orders"
        message="You don't have any open limit orders."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Order Count */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Open Orders ({orders.length})</h3>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onCancel={handleCancelOrder}
            isCancelling={cancellingId === order.id}
            isSubmitting={isSubmitting}
          />
        ))}
      </div>
    </div>
  )
}
