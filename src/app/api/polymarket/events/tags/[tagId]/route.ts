// biome-ignore-all lint/suspicious/noExplicitAny: need to cast the window
import { type NextRequest, NextResponse } from "next/server"

import { GAMMA_API_URL } from "./constants"
import { validateEvents } from "./validMarkets"

export const dynamic = "force-static"
export const revalidate = 60

const headers = {
  headers: {
    "Cache-Control": `public, max-age=${revalidate}`,
  },
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ tagId: string | null }>
  },
) {
  const { tagId } = await params
  const searchParams = request.nextUrl.searchParams
  const limit = searchParams.get("limit") || "50"

  try {
    const fetchLimit = parseInt(limit)

    let url = `${GAMMA_API_URL}/events?active=true&archived=false&closed=false&order=volume24hr&ascending=false&limit=${fetchLimit}&offset=0`

    if (tagId && tagId !== "0") {
      url += `&tag_id=${tagId}&related_tags=true`
    }

    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    })

    if (!response.ok) {
      console.error("Gamma API error:", response.status)
      throw new Error(`Gamma API error: ${response.status}`)
    }

    const events = await response.json()
    if (!Array.isArray(events)) {
      console.error("Invalid response structure:", events)
      return NextResponse.json(
        { error: "Invalid API response" },
        { status: 500 },
      )
    }

    return NextResponse.json(validateEvents(events), headers)
  } catch (error) {
    console.error("Error fetching markets:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch markets",
      },
      { status: 500 },
    )
  }
}
