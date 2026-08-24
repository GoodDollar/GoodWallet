import { type NextRequest, NextResponse } from "next/server"
import {
  type BuilderApiKeyCreds,
  buildHmacSignature,
} from "@polymarket/builder-signing-sdk"

import { polymarketKeys } from "@/configServerless"

const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
  key: polymarketKeys.builderApiKey,
  secret: polymarketKeys.builderSecret,
  passphrase: polymarketKeys.builderPassphrase,
}

// Polymarket's builder credentials are meant to live on a server the browser
// cannot read (see Polymarket/builder-signing-server). So the ClobClient and
// RelayClient are pointed at this proxy rather than at Polymarket, and the
// credentials are attached here on the way out - they never reach the client.
const UPSTREAMS = {
  clob: "https://clob.polymarket.com",
  relayer: "https://relayer-v2.polymarket.com",
} as const

type Target = keyof typeof UPSTREAMS

const isTarget = (target: string): target is Target => target in UPSTREAMS

// The only requests Polymarket wants builder-signed: clob-client's
// postOrder/postOrders/getOpenOrders/getOrder and builder-relayer-client's
// sendAuthedRequest. Everything else is forwarded untouched, so the proxy can
// never be talked into signing something like /auth/builder-api-key.
const BUILDER_SIGNED: { target: Target; method: string; path: RegExp }[] = [
  { target: "clob", method: "POST", path: /^\/orders?$/ },
  { target: "clob", method: "GET", path: /^\/data\/orders$/ },
  { target: "clob", method: "GET", path: /^\/data\/order\/[\w.-]+$/ },
  { target: "relayer", method: "POST", path: /^\/submit$/ },
  { target: "relayer", method: "GET", path: /^\/transactions$/ },
]

// Only the SDKs' own auth headers travel onward - never the cookies and other
// credentials a browser attaches to a same-origin request
const isForwardable = (header: string) =>
  header.startsWith("poly") || header === "content-type" || header === "accept"

// ponytail: per-instance sliding window, so the real ceiling is this times the
// number of warm lambdas. Move to Vercel KV if a global limit ever matters.
const RATE_LIMIT = 600
const RATE_WINDOW_MS = 60_000
const recentRequests = new Map<string, number[]>()

const isRateLimited = (ip: string): boolean => {
  const now = Date.now()
  const hits = (recentRequests.get(ip) ?? []).filter(
    (at) => now - at < RATE_WINDOW_MS,
  )
  hits.push(now)
  if (recentRequests.size > 10_000) {
    recentRequests.clear()
  }
  recentRequests.set(ip, hits)
  return hits.length > RATE_LIMIT
}

const NO_STORE = { "Cache-Control": "no-store" }

const proxy = async (
  request: NextRequest,
  context: { params: Promise<{ target: string; path: string[] }> },
) => {
  const { target, path } = await context.params

  if (!isTarget(target)) {
    return NextResponse.json(
      { error: "Unknown Polymarket target" },
      { status: 404, headers: NO_STORE },
    )
  }

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"

  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: NO_STORE },
    )
  }

  // cancelOrder sends a body with DELETE, so only GET is treated as bodyless
  const body =
    request.method === "GET" ? undefined : (await request.text()) || undefined
  const upstreamPath = `/${path.join("/")}`

  const headers = new Headers()
  request.headers.forEach((value, header) => {
    if (isForwardable(header)) {
      headers.set(header, value)
    }
  })
  // Polymarket enforces trading restrictions on the caller's IP, which is now
  // ours rather than the user's - pass the real client address on so they can
  // still see who is behind the request
  headers.set("x-forwarded-for", clientIp)

  const needsBuilderAuth = BUILDER_SIGNED.some(
    (signable) =>
      signable.target === target &&
      signable.method === request.method &&
      signable.path.test(upstreamPath),
  )

  if (needsBuilderAuth) {
    if (
      !BUILDER_CREDENTIALS.key ||
      !BUILDER_CREDENTIALS.secret ||
      !BUILDER_CREDENTIALS.passphrase
    ) {
      return NextResponse.json(
        { error: "Builder credentials not configured" },
        { status: 500, headers: NO_STORE },
      )
    }

    // Seconds, matching the SDK's own BuilderSigner. Signed over the exact body
    // we forward, which is what Polymarket verifies against.
    const timestamp = Math.floor(Date.now() / 1000)

    headers.set("POLY_BUILDER_API_KEY", BUILDER_CREDENTIALS.key)
    headers.set("POLY_BUILDER_PASSPHRASE", BUILDER_CREDENTIALS.passphrase)
    headers.set("POLY_BUILDER_TIMESTAMP", `${timestamp}`)
    headers.set(
      "POLY_BUILDER_SIGNATURE",
      buildHmacSignature(
        BUILDER_CREDENTIALS.secret,
        timestamp,
        request.method,
        upstreamPath,
        body,
      ),
    )
  }

  try {
    const upstream = await fetch(
      `${UPSTREAMS[target]}${upstreamPath}${request.nextUrl.search}`,
      { method: request.method, headers, body, cache: "no-store" },
    )

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
        ...NO_STORE,
      },
    })
  } catch (error) {
    console.error("Polymarket proxy error:", error)
    return NextResponse.json(
      { error: "Upstream request failed" },
      { status: 502, headers: NO_STORE },
    )
  }
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const DELETE = proxy
