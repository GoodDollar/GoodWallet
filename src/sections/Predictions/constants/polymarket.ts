// Countries we block on top of Polymarket's own geoblock list (ISO 3166-1 alpha-2)
export const ADDITIONAL_BLOCKED_COUNTRIES = ["CY"]

export const GEOBLOCK_API_URL = "https://polymarket.com/api/geoblock"

export const POLYGON_CHAIN_ID = 137

export const POLYGON_RPC_URL =
  process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com"

// The SDK talks to Polymarket directly and asks this endpoint to sign the
// requests that need builder attribution, so the builder credentials stay on the
// server. See src/app/api/polymarket/builder/sign/route.ts.
export const BUILDER_SIGNING_URL = "/api/polymarket/builder/sign"
