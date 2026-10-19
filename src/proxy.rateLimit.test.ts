import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { proxy, RATE_LIMITS } from "./proxy"

const ORIGIN = "http://localhost:3000"
const NOW = Date.UTC(2026, 9, 8, 12)

let ipCounter = 0
const freshIp = () => `proxy-rl-${++ipCounter}`

type CallInit = {
  method?: string
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

const exhaust = async (path: string, limit: number, ip = freshIp()) => {
  for (let i = 0; i < limit; i += 1) {
    expect((await call(path, { ip })).status).not.toBe(429)
  }
  return call(path, { ip })
}

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("proxy cross-origin protection", () => {
  it.each([
    ["Sec-Fetch-Site cross-site", { "sec-fetch-site": "cross-site" }],
    ["mismatched Origin", { Origin: "https://evil.example" }],
  ])("blocks %s", async (_label, headers) => {
    const response = await call("/api/chains/BTC/fee", { headers })
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ message: "Forbidden" })
  })

  it("allows same-origin", async () => {
    expect(
      passesThrough(
        await call("/api/chains/BTC/fee", {
          headers: { "sec-fetch-site": "same-origin" },
        }),
      ),
    ).toBe(true)
  })
})

describe("proxy rate limiting", () => {
  it.each([
    ["balance", "/api/chains/EVM/addresses/0xabc/balance"],
    ["history", "/api/chains/EVM/addresses/0xabc/history"],
    ["utxos", "/api/chains/BTC/addresses/bc1qtest/utxos"],
    ["txLookup", "/api/chains/BTC/transactions/abc123"],
    ["fee", "/api/chains/BTC/fee"],
  ] as const)("limits %s endpoint", async (key, path) => {
    const { limit, windowMs } = RATE_LIMITS[key]
    const blocked = await exhaust(path, limit)
    expect(blocked.status).toBe(429)
    expect(await blocked.json()).toEqual({ message: "Too many requests" })
    expect(blocked.headers.get("retry-after")).toBe(
      String(Math.ceil(windowMs / 1000)),
    )
  })

  it("tracks counters independently per IP", async () => {
    const path = "/api/chains/EVM/addresses/0xabc/history"
    expect(
      (await exhaust(path, RATE_LIMITS.history.limit, "ip-a")).status,
    ).toBe(429)
    expect((await call(path, { ip: "ip-b" })).status).toBe(200)
  })

  it("tracks counters independently per endpoint", async () => {
    const ip = freshIp()
    expect(
      (
        await exhaust(
          "/api/chains/EVM/addresses/0xabc/history",
          RATE_LIMITS.history.limit,
          ip,
        )
      ).status,
    ).toBe(429)
    expect((await call("/api/chains/BTC/fee", { ip })).status).toBe(200)
  })

  it("resets counters after the window", async () => {
    const ip = freshIp()
    const path = "/api/chains/EVM/addresses/0xabc/history"
    const { limit, windowMs } = RATE_LIMITS.history
    expect((await exhaust(path, limit, ip)).status).toBe(429)

    vi.mocked(Date.now).mockReturnValue(NOW + windowMs - 1)
    const stillBlocked = await call(path, { ip })
    expect(stillBlocked.status).toBe(429)
    expect(stillBlocked.headers.get("retry-after")).toBe("1")

    vi.mocked(Date.now).mockReturnValue(NOW + windowMs)
    expect((await call(path, { ip })).status).toBe(200)
  })

  it("does not rate-limit broadcast endpoint", async () => {
    const ip = freshIp()
    for (let i = 0; i < 100; i += 1) {
      expect(
        passesThrough(
          await call("/api/chains/BTC/transactions/broadcast", {
            method: "POST",
            ip,
          }),
        ),
      ).toBe(true)
    }
  })

  it("does not rate-limit unrelated routes", async () => {
    const ip = freshIp()
    for (let i = 0; i < 100; i += 1) {
      expect(passesThrough(await call("/api/tokens", { ip }))).toBe(true)
    }
  })
})
