import { type NextRequest, NextResponse } from "next/server"
import { buildHmacSignature } from "@polymarket/client"

import { polymarketKeys } from "@/configServerless"

// Polymarket's builder credentials are meant to live on a server the browser
// cannot read (see Polymarket/builder-signing-server). The SDK is configured
// with remoteBuilderSigning() pointed here, so it sends us the
// { method, path, body } it is about to request and we hand back the
// POLY_BUILDER_* headers for it - the credentials themselves never reach the
// client.
// Read per request rather than at module load, so the values resolve from the
// runtime environment rather than whatever was set when the lambda booted.
const builderCredentials = () => ({
  key: polymarketKeys.builderApiKey,
  secret: polymarketKeys.builderSecret,
  passphrase: polymarketKeys.builderPassphrase,
})

// The SDK attaches builder headers to *every* CLOB and relayer request, so this
// is a deny list rather than an allow list - an allow list would have to
// enumerate the SDK's whole surface and would break silently whenever it gained
// an endpoint. What actually needs blocking is builder-account management:
// /auth/builder-api-key mints and lists API keys under our builder account, so a
// hostile caller could ask us to sign one and replay the headers at Polymarket.
// The SDK only reaches it through client methods we never call. Everything else
// - including POST /auth/api-key and GET /auth/derive-api-key, which the login
// flow genuinely needs signed - is fair game.
const DENIED = [/^\/auth\/builder-api-key$/, /^\/auth\/api-keys$/]

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

const error = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers: NO_STORE })

export async function POST(request: NextRequest) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"

  if (isRateLimited(clientIp)) {
    return error("Too many requests", 429)
  }

  const builder = builderCredentials()
  if (!builder.key || !builder.secret || !builder.passphrase) {
    return error("Builder credentials not configured", 500)
  }

  let method: unknown
  let path: unknown
  let body: unknown
  try {
    ;({ method, path, body } = await request.json())
  } catch {
    return error("Malformed request", 400)
  }

  if (typeof method !== "string" || typeof path !== "string") {
    return error("method and path are required", 400)
  }
  if (body !== undefined && typeof body !== "string") {
    return error("body must be a string", 400)
  }

  if (DENIED.some((denied) => denied.test(path))) {
    // Loud on purpose: this only fires for a caller going off the SDK's path,
    // so it is worth seeing in the logs rather than silently 403ing.
    console.warn("Polymarket builder signing refused", { method, path })
    return error("Path may not be builder-signed", 403)
  }

  // Seconds, matching the SDK's own signing contract. Signed over the exact body
  // the SDK will send, which is what Polymarket verifies against.
  const timestamp = Math.floor(Date.now() / 1000)

  return NextResponse.json(
    {
      POLY_BUILDER_API_KEY: builder.key,
      POLY_BUILDER_PASSPHRASE: builder.passphrase,
      POLY_BUILDER_SIGNATURE: await buildHmacSignature(
        builder.secret,
        timestamp,
        method,
        path,
        body,
      ),
      POLY_BUILDER_TIMESTAMP: `${timestamp}`,
    },
    { headers: NO_STORE },
  )
}
