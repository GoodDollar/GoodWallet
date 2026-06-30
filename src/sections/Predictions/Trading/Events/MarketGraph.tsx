import { useEffect, useRef, useState } from "react"
import { PriceHistoryInterval } from "@polymarket/clob-client"
import { createChart, LineSeries, type Time } from "lightweight-charts"
import { Button } from "ui"

import type { PolymarketMarket } from "../../hooks/useMarkets"
import usePriceHistory from "../../hooks/usePriceHistory"

const INTERVAL_OPTIONS = [
  { label: "1H", value: PriceHistoryInterval.ONE_HOUR },
  { label: "6H", value: PriceHistoryInterval.SIX_HOURS },
  { label: "1D", value: PriceHistoryInterval.ONE_DAY },
  { label: "1W", value: PriceHistoryInterval.ONE_WEEK },
  { label: "MAX", value: PriceHistoryInterval.MAX },
] as const

export const MarketGraph = ({ market }: { market: PolymarketMarket }) => {
  const [interval, setInterval] = useState<PriceHistoryInterval>(
    PriceHistoryInterval.MAX,
  )
  const { data: history } = usePriceHistory(market, interval)
  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (history?.length && chartContainerRef.current) {
      const container = chartContainerRef.current
      const s = getComputedStyle(container)
      const get = (v: string, fallback: string) =>
        s.getPropertyValue(v).trim() || fallback

      const chart = createChart(container, {
        layout: {
          background: { color: get("--bg-surface", "#111") },
          textColor: get("--token-text", "#fff"),
        },
        width: container.clientWidth,
        height: 300,
        grid: {
          vertLines: { color: get("--token-border", "#4d4d4d") + "33" },
          horzLines: { color: get("--token-border", "#4d4d4d") + "33" },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      })

      const lineSeries = chart.addSeries(LineSeries, {
        color: get("--token-primary", "#1a85ff"),
      })

      const formattedData = history
        .map((h) => ({
          value: h.p * 100,
          time: h.t as Time,
        }))
        .sort((a, b) => (a.time as number) - (b.time as number))

      formattedData.pop() // the clob client returns a duplicated result for the last history item
      lineSeries.setData(formattedData)
      chart.timeScale().fitContent()

      const handleResize = () => {
        chart.applyOptions({ width: container.clientWidth })
      }

      window.addEventListener("resize", handleResize)

      return () => {
        window.removeEventListener("resize", handleResize)
        chart.remove()
      }
    }
  }, [history, interval])

  return (
    <div className="flex flex-col w-full">
      <div ref={chartContainerRef} className="w-full h-[300px]" />
      <div className="flex justify-center gap-1 py-3">
        {INTERVAL_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant="pill"
            text={option.label}
            onClick={() => setInterval(option.value)}
          />
        ))}
      </div>
    </div>
  )
}
