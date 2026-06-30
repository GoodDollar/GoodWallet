// biome-ignore-all lint/suspicious/noExplicitAny: need to cast the window
import type {
  PolymarketEvent,
  PolymarketMarket,
} from "@/sections/Predictions/hooks/useMarkets"

const MIN_LIQUIDITY_USD = 1000

export const validateEvents = (events: any[]): PolymarketEvent[] => {
  const validEvents = []
  for (const event of events) {
    if (event.ended || event.closed || !event.active) {
      continue
    }
    const validMarkets = filterValidMarkets(event)
    if (validMarkets.length === 0) {
      continue
    }

    validEvents.push({
      id: event.id,
      volume: event.volume,
      title: event.title,
      image: event.image,
      markets: validMarkets,
    })
  }
  return validEvents
}

const filterValidMarkets = (event: any) => {
  const validMarkets = []
  for (const market of event.markets) {
    if (!isMarketValid(market)) {
      continue
    }
    validMarkets.push({
      description: market.description,
      id: market.id,
      question: market.question,
      active: market.active,
      closed: market.closed,
      orderMinSize: market.orderMinSize,
      icon: market.icon,
      volume: market.volume,
      outcomes: market.outcomes ? JSON.parse(market.outcomes) : [],
      clobTokenIds: market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [],
      acceptingOrders: market.acceptingOrders,
      negRisk: market.negRisk,
      groupItemTitle: market.groupItemTitle,
    })
  }
  return validMarkets
}

const isMarketValid = (market: PolymarketMarket) => {
  return (
    !market.closed &&
    market.acceptingOrders &&
    market.clobTokenIds &&
    validOutcomePrices(market) &&
    validLiquidity(market)
  )
}

const validOutcomePrices = (market: PolymarketMarket) => {
  let { outcomePrices } = market
  if (!outcomePrices) {
    return false
  }
  if (typeof outcomePrices === "string") {
    outcomePrices = JSON.parse(outcomePrices)
  }

  if (!Array.isArray(outcomePrices)) {
    return false
  }

  return outcomePrices.some(
    (price: string) => parseFloat(price) >= 0.05 && parseFloat(price) <= 0.95,
  )
}

const validLiquidity = (market: PolymarketMarket) => {
  const { liquidity } = market
  if (liquidity === undefined) {
    return false
  }
  return parseFloat(String(liquidity)) > MIN_LIQUIDITY_USD
}
