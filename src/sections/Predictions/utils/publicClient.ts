import { createPublicClient } from "@polymarket/client"

// Market discovery, prices and price history need no credentials, so they run
// off a shared unauthenticated client and render before the user signs in.
export const polymarketPublicClient = createPublicClient()
