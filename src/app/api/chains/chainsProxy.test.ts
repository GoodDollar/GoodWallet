import { NextRequest } from "next/server"
import { randomBytes } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { proxy } from "@/proxy"

import {
  getAddressSessionCookieName,
  issuePowChallenge,
  issuePowSession,
} from "./powSession"

const ORIGIN = "http://localhost:3000"
const NOW = Date.UTC(2026, 9, 7, 12)
const WINDOW = 60_000
const SESSION_TTL = 7 * 24 * 60 * 60_000
// Ephemeral test-only secret: never persisted or sent to a provider.
const secret = randomBytes(32).toString("hex")

const BTC_A = "bc1qtestaddressone"
const BTC_B = "bc1qtestaddresstwo"

// The limiter store is module-global, so every test uses its own client IP.
let ipCounter = 0
const freshIp = () => `chains-proxy-test-${++ipCounter}`

type CallInit = {
  method?: string
  // null omits every client-IP header.
  ip?: string | null
  headers?: Record<string, string>
}

const call = (path: string, { method = "GET", ip, headers }: CallInit = {}) =>
  proxy(
    new NextRequest(`${ORIGIN}${path}`, {
      method,
      headers: {
        Origin: ORIGIN,
        Host: "localhost:3000",
        ...(ip === null ? {} : { "x-real-ip": ip ?? freshIp() }),
        ...headers,
      },
    }),
  )

const passesThrough = (response: Response) =>
  response.headers.get("x-middleware-next") === "1"

const mintSession = async (family: string, address: string) => {
  const { challenge } = await issuePowChallenge(family as "BTC", address)
  const { token } = await issuePowSession(challenge)
  return { name: await getAddressSessionCookieName(family, address), token }
}

const cookieFor = async (family: string, address: string) => {
  const { name, token } = await mintSession(family, address)
  return `${name}=${token}`
}

// Call `limit` times and assert none were limited, then return the next response.
const exhaust = async (path: string, limit: number, ip = freshIp()) => {
  for (let i = 0; i < limit; i += 1) {
    expect((await call(path, { ip })).status).not.toBe(429)
  }
  return call(path, { ip })
}

beforeEach(() => {
  vi.stubEnv("API_OWNERSHIP_ORIGIN", ORIGIN)
  vi.stubEnv("API_POW_SESSION_SECRET", secret)
  vi.spyOn(Date, "now").mockReturnValue(NOW)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe("cross-origin blocking", () => {
  it.each([
    ["Sec-Fetch-Site cross-site", { "sec-fetch-site": "cross-site" }],
    [
      "mismatched Origin without Sec-Fetch-Site",
      { Origin: "https://evil.example" },
    ],
    [
      "cross-site even with a matching Origin",
      { "sec-fetch-site": "cross-site", Origin: ORIGIN },
    ],
  ])("rejects %s", async (_label, headers) => {
    const response = await call("/api/tokens", { headers })
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ message: "Forbidden" })
    expect(passesThrough(response)).toBe(false)
  })

  it.each([
    ["same-origin", { "sec-fetch-site": "same-origin" }],
    ["same-site", { "sec-fetch-site": "same-site" }],
    ["direct navigation", { "sec-fetch-site": "none" }],
    ["no Origin header", { Origin: "" }],
    [
      "Sec-Fetch-Site taking precedence over Origin",
      { "sec-fetch-site": "same-origin", Origin: "https://evil.example" },
    ],
  ])("allows %s", async (_label, headers) => {
    expect(passesThrough(await call("/api/tokens", { headers }))).toBe(true)
  })

  it("does not spend rate-limit budget on blocked cross-site requests", async () => {
    const ip = freshIp()
    for (let i = 0; i < 20; i += 1) {
      const blocked = await call("/api/chains/EVM/addresses/0xabc/history", {
        ip,
        headers: { "sec-fetch-site": "cross-site" },
      })
      expect(blocked.status).toBe(403)
    }
    const response = await call("/api/chains/EVM/addresses/0xabc/history", {
      ip,
    })
    expect(response.status).toBe(401)
  })
})

describe("rate limiting", () => {
  it.each([
    ["balance", 30, "/api/chains/EVM/addresses/0xabc/balance"],
    ["history", 12, "/api/chains/EVM/addresses/0xabc/history"],
    ["utxos", 18, "/api/chains/BTC/addresses/bc1qtestaddressone/utxos"],
    ["fee", 60, "/api/chains/BTC/fee"],
    ["transaction lookup", 30, "/api/chains/BTC/transactions/abc?verbose=true"],
  ])("allows %s up to %i requests per window, then returns 429", async (_label, limit, path) => {
    const blocked = await exhaust(path, limit)
    expect(blocked.status).toBe(429)
    expect(await blocked.json()).toEqual({ message: "Too many requests" })
    expect(blocked.headers.get("retry-after")).toBe("60")
    expect(passesThrough(blocked)).toBe(false)
  })

  it("counts requests that fail the session guard", async () => {
    const blocked = await exhaust("/api/chains/EVM/addresses/0xabc/history", 12)
    expect(blocked.status).toBe(429)
  })

  it("rate limits clients independently", async () => {
    const path = "/api/chains/EVM/addresses/0xabc/history"
    expect((await exhaust(path, 12)).status).toBe(429)
    expect((await call(path)).status).toBe(401)
  })

  it("rate limits endpoints independently for the same client", async () => {
    const ip = freshIp()
    expect(
      (await exhaust("/api/chains/EVM/addresses/0xabc/history", 12, ip)).status,
    ).toBe(429)
    expect(
      (await call("/api/chains/EVM/addresses/0xabc/balance", { ip })).status,
    ).toBe(401)
    expect((await call("/api/chains/BTC/fee", { ip })).status).toBe(200)
  })

  it("reports the remaining window in Retry-After and resets after it", async () => {
    const ip = freshIp()
    const path = "/api/chains/EVM/addresses/0xabc/history"
    expect((await exhaust(path, 12, ip)).status).toBe(429)

    vi.mocked(Date.now).mockReturnValue(NOW + 20_000)
    const stillBlocked = await call(path, { ip })
    expect(stillBlocked.status).toBe(429)
    expect(stillBlocked.headers.get("retry-after")).toBe("40")

    vi.mocked(Date.now).mockReturnValue(NOW + WINDOW - 1)
    expect((await call(path, { ip })).status).toBe(429)

    vi.mocked(Date.now).mockReturnValue(NOW + WINDOW)
    expect((await call(path, { ip })).status).toBe(401)
  })

  it("rounds Retry-After up to at least one second", async () => {
    const ip = freshIp()
    const path = "/api/chains/EVM/addresses/0xabc/history"
    await exhaust(path, 12, ip)
    vi.mocked(Date.now).mockReturnValue(NOW + WINDOW - 1)
    expect((await call(path, { ip })).headers.get("retry-after")).toBe("1")
  })

  it("keys on the first X-Forwarded-For hop, ahead of other IP headers", async () => {
    const path = "/api/chains/EVM/addresses/0xabc/history"
    const hop = `203.0.113.${ipCounter + 1}`
    for (let i = 0; i < 12; i += 1) {
      await call(path, {
        ip: `ignored-${i}`,
        headers: { "x-forwarded-for": `${hop}, 10.0.0.${i}` },
      })
    }
    const response = await call(path, {
      ip: "another-real-ip",
      headers: { "x-forwarded-for": `${hop}, 10.9.9.9` },
    })
    expect(response.status).toBe(429)
  })

  it("falls back to CF-Connecting-IP, then X-Real-IP", async () => {
    const path = "/api/chains/EVM/addresses/0xabc/history"
    const cf = `cf-${freshIp()}`
    for (let i = 0; i < 12; i += 1) {
      await call(path, { ip: `real-${i}`, headers: { "cf-connecting-ip": cf } })
    }
    expect(
      (await call(path, { ip: "real-x", headers: { "cf-connecting-ip": cf } }))
        .status,
    ).toBe(429)
    // Same X-Real-IP is a different client once CF-Connecting-IP differs.
    expect(
      (
        await call(path, {
          ip: "real-0",
          headers: { "cf-connecting-ip": `${cf}-other` },
        })
      ).status,
    ).toBe(401)
  })

  it("buckets requests without any client IP header together", async () => {
    const path = "/api/chains/BTC/addresses/bc1qtestaddressone/utxos"
    for (let i = 0; i < 18; i += 1) {
      expect((await call(path, { ip: null })).status).not.toBe(429)
    }
    expect((await call(path, { ip: null })).status).toBe(429)
  })

  it("never limits or guards the broadcast endpoint", async () => {
    const ip = freshIp()
    for (let i = 0; i < 100; i += 1) {
      const response = await call("/api/chains/BTC/transactions/broadcast", {
        method: "POST",
        ip,
      })
      expect(passesThrough(response)).toBe(true)
    }
  })

  it("never limits unrelated API routes", async () => {
    const ip = freshIp()
    for (let i = 0; i < 100; i += 1) {
      expect(passesThrough(await call("/api/tokens", { ip }))).toBe(true)
    }
  })

  it("limits challenge and verification requests in separate buckets", async () => {
    const ip = freshIp()
    const path = "/api/chains/auth/address"
    for (let i = 0; i < 12; i += 1) {
      expect(passesThrough(await call(path, { ip }))).toBe(true)
    }
    expect((await call(path, { ip })).status).toBe(429)

    for (let i = 0; i < 24; i += 1) {
      expect(passesThrough(await call(path, { method: "POST", ip }))).toBe(true)
    }
    const blocked = await call(path, { method: "POST", ip })
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("retry-after")).toBe("60")
  })

  it("does not require a session cookie for the auth endpoint", async () => {
    expect(passesThrough(await call("/api/chains/auth/address"))).toBe(true)
    expect(
      passesThrough(await call("/api/chains/auth/address", { method: "POST" })),
    ).toBe(true)
  })
})

describe("raw transaction lookup session guard", () => {
  const txPath = (address?: string, query = "") =>
    `/api/chains/BTC/transactions/abc123?${address ? `address=${address}&` : ""}${query}`

  it("requires the owner address for non-verbose lookups", async () => {
    const response = await call("/api/chains/BTC/transactions/abc123")
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      message: "Wallet address is required for raw transaction reads",
    })
    expect(passesThrough(response)).toBe(false)
  })

  it("requires the address even when verbose is false", async () => {
    const response = await call(txPath(undefined, "verbose=false"))
    expect(response.status).toBe(400)
  })

  it("rejects a lookup with an address but no cookie", async () => {
    const response = await call(txPath(BTC_A))
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      message: "Address session required",
    })
  })

  it("allows a lookup with the matching address cookie", async () => {
    const cookie = await cookieFor("BTC", BTC_A)
    const response = await call(txPath(BTC_A), { headers: { Cookie: cookie } })
    expect(passesThrough(response)).toBe(true)
  })

  it("rejects another address's session presented under the requested cookie name", async () => {
    const other = await mintSession("BTC", BTC_B)
    const requestedName = await getAddressSessionCookieName("BTC", BTC_A)
    const response = await call(txPath(BTC_A), {
      headers: { Cookie: `${requestedName}=${other.token}` },
    })
    expect(response.status).toBe(401)
  })

  it("does not accept a session minted for a different family", async () => {
    const dogeSession = await mintSession("DOGE", BTC_A)
    const requestedName = await getAddressSessionCookieName("BTC", BTC_A)
    const response = await call(txPath(BTC_A), {
      headers: { Cookie: `${requestedName}=${dogeSession.token}` },
    })
    expect(response.status).toBe(401)
  })

  it("uses only the cookie named for the requested address", async () => {
    const cookieForB = await cookieFor("BTC", BTC_B)
    const response = await call(txPath(BTC_A), {
      headers: { Cookie: cookieForB },
    })
    expect(response.status).toBe(401)
  })

  it("rejects an expired session", async () => {
    const cookie = await cookieFor("BTC", BTC_A)
    vi.mocked(Date.now).mockReturnValue(NOW + SESSION_TTL)
    const response = await call(txPath(BTC_A), { headers: { Cookie: cookie } })
    expect(response.status).toBe(401)
  })

  it("leaves verbose confirmation lookups unauthenticated", async () => {
    const response = await call(
      "/api/chains/BTC/transactions/abc123?verbose=true",
    )
    expect(passesThrough(response)).toBe(true)
  })

  it("does not guard the fee endpoint", async () => {
    expect(passesThrough(await call("/api/chains/BTC/fee"))).toBe(true)
  })
})
