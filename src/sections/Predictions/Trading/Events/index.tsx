"use client"

import { useState } from "react"
import { useDebouncedEffect } from "@react-hookz/web"
import { Drawer } from "ui"

import EmptyState from "../../components/EmptyState.tsx"
import ErrorState from "../../components/ErrorState.tsx"
import LoadingState from "../../components/LoadingState.tsx"
import {
  type CategoryId,
  DEFAULT_CATEGORY,
  getCategoryById,
} from "../../constants/categories.ts"
import useMarkets, {
  type PolymarketEvent,
  type PolymarketMarket,
} from "../../hooks/useMarkets.ts"
import useSearchEvents from "../../hooks/useSearchEvents.ts"
import { useTrading } from "../../providers/TradingProvider.tsx"
import OrderPlacementModal from "../OrderModal/index.tsx"
import CategoryTabs from "./CategoryTabs.tsx"
import EventCard from "./EventCard.tsx"
import { MarketDrawer } from "./MarketDrawer.tsx"
import SearchBar from "./SearchBar.tsx"

export default function HighVolumeMarkets() {
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(
    null,
  )
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeCategory, setActiveCategory] =
    useState<CategoryId>(DEFAULT_CATEGORY)
  const [query, setQuery] = useState("")
  const [events, setEvents] = useState<PolymarketEvent[]>([])
  const [selectedOutcome, setSelectedOutcome] = useState<{
    marketTitle: string
    outcome: string
    price: number
    tokenId: string
    negRisk: boolean
    orderMinSize: number
  } | null>(null)

  const { isGeoblocked } = useTrading()

  const {
    data: eventsUnfiltered,
    isLoading,
    error,
  } = useMarkets({
    limit: 10,
    categoryId: activeCategory,
  })

  const { searchEvents } = useSearchEvents()

  const category = getCategoryById(activeCategory)
  const categoryLabel = category?.label || "Markets"

  const handleOutcomeClick = (
    marketTitle: string,
    outcome: string,
    price: number,
    tokenId: string,
    negRisk: boolean,
    orderMinSize: number,
  ) => {
    setSelectedOutcome({
      marketTitle,
      outcome,
      price,
      tokenId,
      negRisk,
      orderMinSize,
    })
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedOutcome(null)
  }

  const handleCategoryChange = (categoryId: CategoryId) => {
    setActiveCategory(categoryId)
  }

  const handleMarketClick = (market: PolymarketMarket) => {
    setSelectedMarket(market)
  }

  const handleOnSearch = async (query: string) => {
    setQuery(query)
  }

  useDebouncedEffect(
    async () => {
      if (query.length === 0) {
        setEvents(eventsUnfiltered ?? [])
        return
      }
      const events = await searchEvents(query.replace(" ", "+"))
      setEvents(events)
    },
    [query, eventsUnfiltered],
    500,
  )

  return (
    <>
      <div className="space-y-4">
        <SearchBar onSearch={handleOnSearch} />
        {/* Category Tabs */}
        <CategoryTabs
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{categoryLabel} Markets</h3>
        </div>

        {/* Loading State */}
        {isLoading && (
          <LoadingState
            message={`Loading ${categoryLabel.toLowerCase()} markets...`}
          />
        )}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorState error={error} title="Error loading markets" />
        )}

        {/* Empty State */}
        {!isLoading && !error && (!events || events.length === 0) && (
          <EmptyState
            title="No Markets Available"
            message={`No active ${categoryLabel.toLowerCase()} markets found.`}
          />
        )}

        {/* Market Cards */}
        {!isLoading && !error && events && events.length > 0 && (
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard
                onMarketClick={handleMarketClick}
                key={event.id}
                event={event}
                disabled={isGeoblocked}
                onOutcomeClick={handleOutcomeClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Market Drawer */}
      <Drawer
        open={selectedMarket !== null}
        onClose={() => setSelectedMarket(null)}
      >
        {selectedMarket && <MarketDrawer market={selectedMarket} />}
      </Drawer>

      {/* Order Placement Modal */}
      {selectedOutcome && (
        <OrderPlacementModal
          orderMinSize={selectedOutcome.orderMinSize}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          marketTitle={selectedOutcome.marketTitle}
          outcome={selectedOutcome.outcome}
          currentPrice={selectedOutcome.price}
          tokenId={selectedOutcome.tokenId}
          negRisk={selectedOutcome.negRisk}
        />
      )}
    </>
  )
}
