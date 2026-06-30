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

function isCrossOrigin(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site")
  if (site) return site === "cross-site"

  const origin = request.headers.get("origin")
  if (!origin) return false
  return new URL(origin).host !== request.headers.get("host")
}

export function proxy(request: NextRequest) {
  if (isCrossOrigin(request)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }
  return NextResponse.next()
}
