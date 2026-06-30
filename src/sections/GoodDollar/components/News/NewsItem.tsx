import Image from "next/image"

import type { NewsItemType } from "./readNewsListFetcher"

export function NewsItem(props: { newsItem: NewsItemType }) {
  const { newsItem } = props
  return (
    <div className="flex flex-col gap-y-2 pb-6">
      <Image
        className="relative rounded-xl w-full h-32 object-cover"
        src={`${newsItem.picture?.url}`}
        alt={newsItem.title}
        width="0"
        height="0"
        layout="responsive"
      />
      <h3>{newsItem.title}</h3>
      <h6>{newsItem.content}</h6>
      <div className="flex gap-1">
        <h6 className="rounded bg-gray-5 text-black font-bold px-1">
          Published on GoodWallet
        </h6>
        <h6 className="text-gray-4">
          {Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }).format(new Date(newsItem.publishedAt))}
        </h6>
      </div>
    </div>
  )
}
