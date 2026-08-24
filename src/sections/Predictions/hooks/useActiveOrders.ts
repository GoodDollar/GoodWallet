import type { OpenOrder, SecureClient } from "@polymarket/client"
import useSWR from "swr"

import { QUERY_REFETCH_INTERVALS } from "../constants/query"

export type PolymarketOrder = OpenOrder

export default function useActiveOrders(
  client: SecureClient | null,
  walletAddress: string | undefined,
) {
  return useSWR(
    [walletAddress, client, "active-orders"],
    async (): Promise<PolymarketOrder[]> => {
      if (!client || !walletAddress) {
        return []
      }

      try {
        const orders: PolymarketOrder[] = []
        for await (const page of client.listOpenOrders()) {
          orders.push(...page.items)
        }

        return orders.filter((order) => order.status === "LIVE")
      } catch (err) {
        console.error("Error fetching open orders:", err)
        return []
      }
    },
    {
      refreshInterval: QUERY_REFETCH_INTERVALS.ORDERS,
      revalidateOnFocus: true,
    },
  )
}
