import { useCallback } from "react"

import type { PolymarketEvent } from "./useMarkets"

export default function useSearchEvents() {
  const searchEvents = useCallback(async (query: string) => {
    const response = await fetch(`/api/polymarket/events/search/${query}`)
    const data = await response.json()
    return data as PolymarketEvent[]
  }, [])

  return {
    searchEvents,
  }
}
