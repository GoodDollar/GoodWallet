// Countries we block on top of Polymarket's own geoblock list (ISO 3166-1 alpha-2)
export const ADDITIONAL_BLOCKED_COUNTRIES = ["CY"]

// Polymarket API URLs
export const CLOB_API_URL = "https://clob.polymarket.com"
export const GEOBLOCK_API_URL = "https://polymarket.com/api/geoblock"
export const GAMMA_API_URL = "https://gamma-api.polymarket.com"
export const POLYMARKET_PROFILE_URL = (address: string) =>
  `https://polymarket.com/${address}`

// RPC
export const POLYGON_RPC_URL =
  process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"

// The clients that need builder credentials talk to Polymarket through our own
// proxy, which attaches them server-side. Reads that need no builder auth
// (CLOB_API_URL above) still go straight to Polymarket.
export const BUILDER_PROXY_URL = (target: "clob" | "relayer") =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/api/polymarket/builder/${target}`
