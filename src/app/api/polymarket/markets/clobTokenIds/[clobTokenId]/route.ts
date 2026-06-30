import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-static"
export const revalidate = 43200 // 12 hours

const GAMMA_API = "https://gamma-api.polymarket.com"
const headers = {
  headers: {
    "Cache-Control": `public, max-age=${revalidate}`,
  },
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clobTokenId: string }> },
) {
  const clobTokenId = (await params).clobTokenId

  if (!clobTokenId) {
    return NextResponse.json(
      { error: "clobTokenId parameter is required" },
      headers,
    )
  }

  try {
    const response = await fetch(
      `${GAMMA_API}/markets?clob_token_ids=${clobTokenId}`,
      {
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 300 },
      },
    )

    if (!response.ok) {
      console.error("Gamma API error:", response.status)
      throw new Error(`Gamma API error: ${response.status}`)
    }

    const markets = await response.json()
    if (
      !markets ||
      !Array.isArray(markets) ||
      markets.length === 0 ||
      markets[0] == null
    ) {
      throw new Error("Market not found")
    }

    return NextResponse.json(
      {
        outcomes: markets[0].outcomes,
        clobTokenIds: markets[0].clobTokenIds,
        question: markets[0].question,
      },
      headers,
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to fetch market by token" },
      { status: 500 },
    )
  }
}
