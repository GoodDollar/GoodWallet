"use client"
import useSWRImmutable from "swr/immutable"

import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"

import { NewsItemWithLink } from "./NewsItemWithLink"
import { readNewsListFetcher } from "./readNewsListFetcher"

export default function NewsView() {
  const { isLoading, data: newsList } = useSWRImmutable(
    "goodDollarNewsList",
    () => readNewsListFetcher({ page: 0, limit: 20 }),
    {
      revalidateOnFocus: false,
    },
  )

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!newsList) return null

  return newsList.map((newsItem) => (
    <NewsItemWithLink key={newsItem.id} newsItem={newsItem} />
  ))
}
