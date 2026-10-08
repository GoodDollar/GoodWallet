import { type NextRequest, NextResponse } from "next/server"

/**
 * Proxy (Next.js middleware) for /api/*.
 *
 * Now that the code is public, this stops other sites from using our API — and
 * the server-only keys behind it — through their visitors' browsers. Our own
 * app only ever calls its own origin, so we block cross-origin browser requests
 * and let same-origin traffic, direct navigations and non-browser callers
 * (server-to-server, health checks) through.
 *
 * `Sec-Fetch-Site` is set by the browser and can't be forged by page scripts;
 * for the rare clients that omit it we fall back to comparing `Origin` to the
 * request host.
 */

export const config = {
  matcher: "/api/:path*",
}

type RateLimitPolicy = {
  limit: number
  windowMs: number
}

type RateLimitEntry = {
  resetAt: number
  hits: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

const RATE_LIMITS = {
  balance: { limit: 30, windowMs: 60 * 1000 },
  history: { limit: 12, windowMs: 60 * 1000 },
  utxos: { limit: 18, windowMs: 60 * 1000 },
  txLookup: { limit: 30, windowMs: 60 * 1000 },
  fee: { limit: 60, windowMs: 60 * 1000 },
} satisfies Record<string, RateLimitPolicy>

function isCrossOrigin(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site")
  if (site) return site === "cross-site"

  const origin = request.headers.get("origin")
  if (!origin) return false
  return new URL(origin).host !== request.headers.get("host")
}

function isTxLookupPath(pathname: string) {
  return (
    /\/api\/chains\/[^/]+\/transactions\/[^/]+$/.test(pathname) &&
    !pathname.endsWith("/broadcast")
  )
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown"
  }

  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    "unknown"
  )
}

function applyRateLimit(
  request: NextRequest,
  key: string,
  policy: RateLimitPolicy,
) {
  const now = Date.now()
  const clientIp = getClientIp(request)
  const compositeKey = `${clientIp}:${key}`
  const current = rateLimitStore.get(compositeKey)

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(compositeKey, {
      hits: 1,
      resetAt: now + policy.windowMs,
    })
    return null
  }

  if (current.hits >= policy.limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    return NextResponse.json(
      { message: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      },
    )
  }

  current.hits += 1
  rateLimitStore.set(compositeKey, current)
  return null
}

function getPolicyForPath(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.endsWith("/balance")) {
    return { key: "balance", policy: RATE_LIMITS.balance }
  }

  if (pathname.endsWith("/history")) {
    return { key: "history", policy: RATE_LIMITS.history }
  }

  if (pathname.endsWith("/utxos")) {
    return { key: "utxos", policy: RATE_LIMITS.utxos }
  }

  if (pathname.endsWith("/fee")) {
    return { key: "fee", policy: RATE_LIMITS.fee }
  }

  if (request.method === "GET" && isTxLookupPath(pathname)) {
    return { key: "txLookup", policy: RATE_LIMITS.txLookup }
  }

  return null
}

export function proxy(request: NextRequest) {
  if (isCrossOrigin(request)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const routePolicy = getPolicyForPath(request)
  if (routePolicy) {
    const rateLimitResponse = applyRateLimit(
      request,
      routePolicy.key,
      routePolicy.policy,
    )
    if (rateLimitResponse) {
      return rateLimitResponse
    }
  }

  return NextResponse.next()
}
