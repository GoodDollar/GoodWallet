import { NextRequest } from "next/server"
import { buildHmacSignature } from "@polymarket/builder-signing-sdk"
import { beforeEach, describe, expect, it, vi } from "vitest"

const CREDS = vi.hoisted(() => ({
  builderApiKey: "test-api-key",
  builderSecret: "dGVzdC1zZWNyZXQ=",
  builderPassphrase: "test-passphrase",
}))

vi.mock("@/configServerless", () => ({ polymarketKeys: CREDS }))

import { DELETE, GET, POST } from "./route"

const upstream = vi.fn<typeof fetch>(
  async () =>
    new Response('{"ok":true}', {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
)

beforeEach(() => {
  upstream.mockClear()
  vi.stubGlobal("fetch", upstream)
})

// Each test uses its own IP so the module-level rate limiter can't leak between them
const call = (
  handler: typeof GET,
  {
    method,
    target,
    path,
    search = "",
    body,
    ip,
    headers = {},
  }: {
    method: string
    target: string
    path: string[]
    search?: string
    body?: string
    ip: string
    headers?: Record<string, string>
  },
) =>
  handler(
    new NextRequest(
      `https://goodwallet.etoro.com/api/polymarket/builder/${target}/${path.join("/")}${search}`,
      {
        method,
        headers: { "x-forwarded-for": ip, ...headers },
        body,
      },
    ),
    { params: Promise.resolve({ target, path }) },
  )

const forwarded = () => {
  const call = upstream.mock.lastCall
  if (!call) throw new Error("nothing was forwarded upstream")
  return { url: String(call[0]), init: call[1] ?? {} }
}

const sentHeaders = () => new Headers(forwarded().init.headers)

describe("Polymarket builder proxy", () => {
  it("attaches builder credentials to the requests Polymarket wants signed", async () => {
    const body = '{"tokenID":"1"}'
    const response = await call(POST, {
      method: "POST",
      target: "clob",
      path: ["order"],
      body,
      ip: "1.1.1.1",
    })

    expect(response.status).toBe(200)
    expect(forwarded().url).toBe("https://clob.polymarket.com/order")

    const sent = sentHeaders()
    const timestamp = Number(sent.get("poly_builder_timestamp"))

    expect(sent.get("poly_builder_api_key")).toBe(CREDS.builderApiKey)
    expect(timestamp).toBeCloseTo(Math.floor(Date.now() / 1000), -1)
    // Signed over the exact body we forward, which is what Polymarket verifies
    expect(sent.get("poly_builder_signature")).toBe(
      buildHmacSignature(
        CREDS.builderSecret,
        timestamp,
        "POST",
        "/order",
        body,
      ),
    )
  })

  it("forwards everything else unsigned, query string included", async () => {
    await call(GET, {
      method: "GET",
      target: "clob",
      path: ["price"],
      search: "?token_id=1&side=SELL",
      ip: "2.2.2.2",
    })

    expect(forwarded().url).toBe(
      "https://clob.polymarket.com/price?token_id=1&side=SELL",
    )
    expect(sentHeaders().get("poly_builder_api_key")).toBeNull()
  })

  it("passes the user's own auth headers and client IP on, but not cookies", async () => {
    await call(GET, {
      method: "GET",
      target: "clob",
      path: ["data", "orders"],
      ip: "3.3.3.3",
      headers: {
        poly_api_key: "user-key",
        cookie: "session=secret",
      },
    })

    const sent = sentHeaders()
    expect(sent.get("poly_api_key")).toBe("user-key")
    expect(sent.get("poly_builder_api_key")).toBe(CREDS.builderApiKey)
    expect(sent.get("cookie")).toBeNull()
    expect(sent.get("x-forwarded-for")).toBe("3.3.3.3")
  })

  it("keeps the body on DELETE, which is how cancelOrder is sent", async () => {
    await call(DELETE, {
      method: "DELETE",
      target: "clob",
      path: ["order"],
      body: '{"orderID":"abc"}',
      ip: "4.4.4.4",
    })

    expect(forwarded().init.body).toBe('{"orderID":"abc"}')
    // DELETE /order is not on the builder-signed list
    expect(sentHeaders().get("poly_builder_signature")).toBeNull()
  })

  it("refuses unknown upstreams instead of proxying them", async () => {
    const response = await call(GET, {
      method: "GET",
      target: "evil.example.com",
      path: ["order"],
      ip: "5.5.5.5",
    })

    expect(response.status).toBe(404)
    expect(upstream).not.toHaveBeenCalled()
  })

  it("rate limits a single caller", async () => {
    let lastStatus = 200
    for (let i = 0; i < 700 && lastStatus === 200; i++) {
      lastStatus = (
        await call(GET, {
          method: "GET",
          target: "clob",
          path: ["price"],
          ip: "6.6.6.6",
        })
      ).status
    }
    expect(lastStatus).toBe(429)
  })
})
