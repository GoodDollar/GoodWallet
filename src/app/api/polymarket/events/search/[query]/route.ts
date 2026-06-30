import { type NextRequest, NextResponse } from "next/server"

import { GAMMA_API_URL } from "../../tags/[tagId]/constants"
import { validateEvents } from "../../tags/[tagId]/validMarkets"

export const dynamic = "force-static"
export const revalidate = 60

const headers = {
  headers: {
    "Cache-Control": `public, max-age=${revalidate}`,
  },
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ query: string }> },
) {
  const { query } = await params
  try {
    const searchParams = new URLSearchParams({
      q: query,
      limit_per_type: "20",
      type: "events",
      events_status: "active",
      optimized: "false",
    })
    const url = `${GAMMA_API_URL}/search-v2?${searchParams}`
    const response = await fetch(url)

    if (!response.ok) {
      console.error(await response.json())
      return NextResponse.json(
        { error: "Failed to fetch events" },
        { status: response.status },
      )
    }
    const events = await response.json()
    const data = validateEvents(events.events)
    return NextResponse.json(data, headers)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch events" })
  }
}
