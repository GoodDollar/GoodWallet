"use client"

import Link from "next/link"

import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"

import { NewsItem } from "./NewsItem"
import type { NewsItemType } from "./readNewsListFetcher"

export function NewsItemWithLink(props: { newsItem: NewsItemType }) {
  const { newsItem } = props
  const { captureEvent } = useAnalytics()

  return (
    <Link
      onClick={() => {
        captureEvent({
          type: AnalyticsEventTypes.NewsItemClicked,
          url: newsItem.link,
        })
      }}
      href={newsItem.link}
      target="_blank"
    >
      <NewsItem newsItem={newsItem} />
    </Link>
  )
}
