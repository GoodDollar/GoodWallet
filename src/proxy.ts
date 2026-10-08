import { type NextRequest, NextResponse } from "next/server"

import {
  getAddressSessionCookieName,
  isProtectedAddressReadPath,
  isTxLookupPath,
  verifyPowSessionCookie,
} from "@/app/api/chains/powSession"

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
  addressChallenge: { limit: 12, windowMs: 60 * 1000 },
  addressChallengeVerify: { limit: 24, windowMs: 60 * 1000 },
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

function getAddressFromPath(pathname: string) {
  const match = pathname.match(
    /^\/api\/chains\/[^/]+\/addresses\/([^/]+)\/(balance|history|utxos)$/,
  )
  return match?.[1] ?? null
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

export async function proxy(request: NextRequest) {
  if (isCrossOrigin(request)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const pathname = request.nextUrl.pathname

  const family = pathname.split("/")[3] ?? ""

  if (pathname === "/api/chains/auth/address") {
    const rateLimitResponse = applyRateLimit(
      request,
      request.method === "POST" ? "addressChallengeVerify" : "addressChallenge",
      request.method === "POST"
        ? RATE_LIMITS.addressChallengeVerify
        : RATE_LIMITS.addressChallenge,
    )

    return rateLimitResponse ?? NextResponse.next()
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

  if (isProtectedAddressReadPath(pathname)) {
    const address = getAddressFromPath(pathname)
    if (!address) {
      return NextResponse.json(
        { message: "Missing wallet address" },
        { status: 400 },
      )
    }

    const cookieName = await getAddressSessionCookieName(family, address)
    const isValid = await verifyPowSessionCookie(
      request.cookies.get(cookieName)?.value,
      family,
      address,
    )
    if (!isValid) {
      return NextResponse.json(
        { message: "Address session required" },
        { status: 401 },
      )
    }
  }

  if (
    request.method === "GET" &&
    isTxLookupPath(pathname) &&
    request.nextUrl.searchParams.get("verbose") !== "true"
  ) {
    const address = request.nextUrl.searchParams.get("address")
    if (!address) {
      return NextResponse.json(
        { message: "Wallet address is required for raw transaction reads" },
        { status: 400 },
      )
    }

    const cookieName = await getAddressSessionCookieName(family, address)
    const isValid = await verifyPowSessionCookie(
      request.cookies.get(cookieName)?.value,
      family,
      address,
    )
    if (!isValid) {
      return NextResponse.json(
        { message: "Address session required" },
        { status: 401 },
      )
    }
  }

  return NextResponse.next()
}
