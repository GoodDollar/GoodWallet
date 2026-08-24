import { NextRequest } from "next/server"
import { buildHmacSignature } from "@polymarket/client"
import { describe, expect, it, vi } from "vitest"

const CREDS = vi.hoisted(() => ({
  builderApiKey: "test-api-key",
  builderSecret: "dGVzdC1zZWNyZXQ=",
  builderPassphrase: "test-passphrase",
}))

vi.mock("@/configServerless", () => ({ polymarketKeys: CREDS }))

import { POST } from "./route"

// Each test uses its own IP so the module-level rate limiter can't leak between them
const call = (body: unknown, ip: string) =>
  POST(
    new NextRequest(
      "https://goodwallet.etoro.com/api/polymarket/builder/sign",
      {
        method: "POST",
        headers: { "x-forwarded-for": ip, "content-type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      },
    ),
  )

describe("POST /api/polymarket/builder/sign", () => {
  it("returns the four builder headers for a signable request", async () => {
    const response = await call(
      { method: "POST", path: "/orders", body: '{"order":1}' },
      "1.1.1.1",
    )

    expect(response.status).toBe(200)
    const headers = await response.json()
    expect(headers).toMatchObject({
      POLY_BUILDER_API_KEY: "test-api-key",
      POLY_BUILDER_PASSPHRASE: "test-passphrase",
    })
    expect(headers.POLY_BUILDER_TIMESTAMP).toMatch(/^\d+$/)
    expect(headers.POLY_BUILDER_SIGNATURE).toBe(
      await buildHmacSignature(
        CREDS.builderSecret,
        Number(headers.POLY_BUILDER_TIMESTAMP),
        "POST",
        "/orders",
        '{"order":1}',
      ),
    )
  })

  it("signs bodyless requests", async () => {
    const response = await call(
      { method: "GET", path: "/data/orders" },
      "1.1.1.2",
    )

    expect(response.status).toBe(200)
    const headers = await response.json()
    expect(headers.POLY_BUILDER_SIGNATURE).toBe(
      await buildHmacSignature(
        CREDS.builderSecret,
        Number(headers.POLY_BUILDER_TIMESTAMP),
        "GET",
        "/data/orders",
        undefined,
      ),
    )
  })

  it("signs the credential endpoints the login flow needs", async () => {
    const created = await call(
      { method: "POST", path: "/auth/api-key" },
      "1.1.1.3",
    )
    const derived = await call(
      { method: "GET", path: "/auth/derive-api-key" },
      "1.1.1.4",
    )

    expect(created.status).toBe(200)
    expect(derived.status).toBe(200)
  })

  it("refuses to sign builder account management", async () => {
    for (const [i, path] of [
      "/auth/builder-api-key",
      "/auth/api-keys",
    ].entries()) {
      const response = await call({ method: "POST", path }, `1.1.2.${i}`)

      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({
        error: "Path may not be builder-signed",
      })
    }
  })

  it("rejects a request missing method or path", async () => {
    const response = await call({ path: "/orders" }, "1.1.3.1")

    expect(response.status).toBe(400)
  })

  it("rejects a non-string body", async () => {
    const response = await call(
      { method: "POST", path: "/orders", body: { order: 1 } },
      "1.1.3.2",
    )

    expect(response.status).toBe(400)
  })

  it("rejects malformed JSON", async () => {
    const response = await call("not json", "1.1.3.3")

    expect(response.status).toBe(400)
  })

  it("rate limits a single caller", async () => {
    const ip = "1.1.4.1"
    let lastStatus = 200
    for (let i = 0; i < 700 && lastStatus === 200; i++) {
      lastStatus = (await call({ method: "POST", path: "/orders" }, ip)).status
    }

    expect(lastStatus).toBe(429)
  })

  it("500s when the builder credentials are not configured", async () => {
    const secret = CREDS.builderSecret
    CREDS.builderSecret = ""
    try {
      const response = await call(
        { method: "POST", path: "/orders" },
        "1.1.5.1",
      )

      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({
        error: "Builder credentials not configured",
      })
    } finally {
      CREDS.builderSecret = secret
    }
  })
})
