import { config } from "@/config"

const newsStreamConfig = config.newsStreamConfig

export const readNewsListFetcher = async ({
  page = 0,
  limit = 20,
} = {}): Promise<NewsItemType[]> => {
  const urlObj = new URL(newsStreamConfig.feedUrl)
  urlObj.searchParams.set("page", page.toString())
  urlObj.searchParams.set("pageSize", limit.toString())
  newsStreamConfig.tag && urlObj.searchParams.set("tag", newsStreamConfig.tag)
  newsStreamConfig.context &&
    urlObj.searchParams.set("context", newsStreamConfig.context)

  const res = await fetch(urlObj)

  if (!res.ok) {
    console.error("Failed to fetch news list:", res.status, res.statusText)
    return []
  }
  const { data: items } = await res.json()
  const data: NewsItemType[] = items

  return data.filter((_) => _.picture && _.picture.url.startsWith("http"))
}

export type NewsItemType = {
  id: number
  link: string
  picture?: {
    url: string
  }
  updatedAt: string
  publishedAt: string
  title: string
  context: string
  content: string
}
