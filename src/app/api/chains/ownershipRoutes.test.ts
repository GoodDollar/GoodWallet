import { NextRequest } from "next/server"
import { randomBytes } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ChainFamily } from "@/chain/types"

import { GET, POST } from "./auth/address/route"
import {
  normalizeOwnershipAddress,
  OwnershipScope,
  ownershipMessage,
} from "./ownershipProtocol"
import {
  getOwnershipAudience,
  isProtectedAddressReadPath,
  isTxLookupPath,
} from "./powSession"

const ORIGIN = "http://localhost:3000"
const NOW = Date.UTC(2026, 9, 7, 12)
// Ephemeral test-only secret: never persisted or sent to a provider.
const secret = randomBytes(32).toString("hex")

const decodeToken = (token: string) =>
  JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"))

const getChallenge = (query: Record<string, string>) =>
  GET(
    new NextRequest(
      `${ORIGIN}/api/chains/auth/address?${new URLSearchParams(query)}`,
    ),
  )

const postRaw = (body: string, origin: string | null = ORIGIN) =>
  POST(
    new NextRequest(`${ORIGIN}/api/chains/auth/address`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(origin === null ? {} : { Origin: origin }),
      },
      body,
    }),
  )

const validBody = {
  family: "EVM",
  address: "0xabc",
  challenge: "payload.mac",
  nonce: 0,
  signature: "0xsignature",
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

describe("ownership protocol helpers", () => {
  it("lowercases only EVM addresses", () => {
    expect(normalizeOwnershipAddress("EVM", "0xAbCd")).toBe("0xabcd")
    for (const family of ["BTC", "DOGE", "SOLANA", "XRP"]) {
      expect(normalizeOwnershipAddress(family, "AbCd")).toBe("AbCd")
    }
  })

  it("builds a domain-separated message ending in the exact challenge", () => {
    const message = ownershipMessage("payload.mac")
    expect(message.startsWith("GoodWallet API ownership v2\n")).toBe(true)
    expect(message.endsWith("Challenge: payload.mac")).toBe(true)
  })

  it.each(ChainFamily)("accepts a %s scope", (family) => {
    expect(
      OwnershipScope.safeParse({ family, address: "Abc123" }).success,
    ).toBe(true)
  })

  it.each([
    ["unknown family", { family: "ETH", address: "abc" }],
    ["missing family", { address: "abc" }],
    ["empty address", { family: "EVM", address: "" }],
    ["missing address", { family: "EVM" }],
    ["slash", { family: "EVM", address: "a/b" }],
    ["dot segments", { family: "EVM", address: ".." }],
    ["space", { family: "EVM", address: "a b" }],
    ["query characters", { family: "EVM", address: "a?b=c" }],
    ["oversized address", { family: "EVM", address: "a".repeat(129) }],
  ])("rejects a scope with %s", (_label, scope) => {
    expect(OwnershipScope.safeParse(scope).success).toBe(false)
  })
})

describe("path matchers", () => {
  it.each([
    "balance",
    "history",
    "utxos",
  ])("protects the %s read", (endpoint) => {
    expect(
      isProtectedAddressReadPath(`/api/chains/EVM/addresses/0xabc/${endpoint}`),
    ).toBe(true)
  })

  it.each([
    "/api/chains/BTC/fee",
    "/api/chains/BTC/transactions/abc",
    "/api/chains/EVM/addresses/0xabc/other",
    "/api/chains/EVM/addresses/0xabc/balance/extra",
    "/api/chains/EVM/addresses/balance",
    "/api/chains/auth/address",
    "/api/tokens",
  ])("does not treat %s as an address read", (path) => {
    expect(isProtectedAddressReadPath(path)).toBe(false)
  })

  it("matches transaction lookups but never the broadcast endpoint", () => {
    expect(isTxLookupPath("/api/chains/BTC/transactions/abc123")).toBe(true)
    expect(isTxLookupPath("/api/chains/BTC/transactions/broadcast")).toBe(false)
    expect(isTxLookupPath("/api/chains/BTC/transactions")).toBe(false)
    expect(isTxLookupPath("/api/chains/BTC/transactions/a/b")).toBe(false)
    expect(isTxLookupPath("/api/chains/BTC/fee")).toBe(false)
  })
})

describe("getOwnershipAudience", () => {
  it("returns the configured canonical origin", () => {
    vi.stubEnv("API_OWNERSHIP_ORIGIN", "https://wallet.example")
    expect(getOwnershipAudience()).toBe("https://wallet.example")
  })

  it("defaults to localhost outside production", () => {
    vi.stubEnv("API_OWNERSHIP_ORIGIN", undefined)
    expect(getOwnershipAudience()).toBe("http://localhost:3000")
  })

  it.each([
    "http://localhost:3000/",
    "http://localhost:3000/path",
    "https://wallet.example?x=1",
    "not a url",
    "",
  ])("rejects non-canonical origin %j", (value) => {
    vi.stubEnv("API_OWNERSHIP_ORIGIN", value)
    expect(() => getOwnershipAudience()).toThrow()
  })

  it("requires an explicit HTTPS origin in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("API_OWNERSHIP_ORIGIN", undefined)
    expect(() => getOwnershipAudience()).toThrow()
    vi.stubEnv("API_OWNERSHIP_ORIGIN", "http://wallet.example")
    expect(() => getOwnershipAudience()).toThrow()
    vi.stubEnv("API_OWNERSHIP_ORIGIN", "https://wallet.example")
    expect(getOwnershipAudience()).toBe("https://wallet.example")
  })
})

describe("GET challenge endpoint", () => {
  it("issues a no-store challenge bound to the normalized EVM scope", async () => {
    const response = await getChallenge({ family: "EVM", address: "0xAbCdEf" })
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    const body = await response.json()
    expect(body.difficultyPrefix).toBe("0000")
    expect(body.expiresAt).toBe(NOW + 5 * 60_000)
    expect(decodeToken(body.challenge)).toMatchObject({
      type: "ownership-challenge-v2",
      payload: {
        family: "EVM",
        address: "0xabcdef",
        audience: ORIGIN,
        issuedAt: NOW,
      },
    })
  })

  it("preserves the case of non-EVM addresses", async () => {
    const response = await getChallenge({ family: "SOLANA", address: "AbCdEf" })
    expect(
      decodeToken((await response.json()).challenge).payload,
    ).toMatchObject({ family: "SOLANA", address: "AbCdEf" })
  })

  it.each([
    ["missing family", { address: "abc" }],
    ["unknown family", { family: "ETH", address: "abc" }],
    ["missing address", { family: "EVM" }],
    ["address with symbols", { family: "EVM", address: "a/../b" }],
    ["oversized address", { family: "EVM", address: "a".repeat(129) }],
  ])("returns 400 without leaking details for %s", async (_label, query) => {
    const response = await getChallenge(query)
    expect(response.status).toBe(400)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(await response.json()).toEqual({
      message: "Unable to issue ownership challenge",
    })
  })

  it.each([
    ["missing secret", "API_POW_SESSION_SECRET", ""],
    ["short secret", "API_POW_SESSION_SECRET", "too-short"],
    ["non-canonical origin", "API_OWNERSHIP_ORIGIN", "http://localhost:3000/"],
  ])("returns 503 for %s", async (_label, name, value) => {
    vi.stubEnv(name, value)
    const response = await getChallenge({ family: "EVM", address: "0xabc" })
    expect(response.status).toBe(503)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("set-cookie")).toBeNull()
  })
})

describe("POST verification input handling", () => {
  const expectNoSession = (response: Response, status: number) => {
    expect(response.status).toBe(status)
    expect(response.headers.get("set-cookie")).toBeNull()
    expect(response.headers.get("cache-control")).toBe("private, no-store")
  }

  it("returns 400 for malformed JSON", async () => {
    expectNoSession(await postRaw("{not json"), 400)
  })

  it.each([
    ["missing family", { ...validBody, family: undefined }],
    ["unknown family", { ...validBody, family: "ETH" }],
    ["missing signature", { ...validBody, signature: undefined }],
    ["empty signature", { ...validBody, signature: "" }],
    ["oversized signature", { ...validBody, signature: "s".repeat(301) }],
    ["oversized public key", { ...validBody, publicKey: "k".repeat(131) }],
    ["oversized challenge", { ...validBody, challenge: "c".repeat(2049) }],
    ["string nonce", { ...validBody, nonce: "0" }],
    ["array body", [validBody]],
  ])("returns 400 for %s", async (_label, body) => {
    expectNoSession(await postRaw(JSON.stringify(body)), 400)
  })

  it("returns 413 for payloads over 4096 characters", async () => {
    expectNoSession(
      await postRaw(
        JSON.stringify({ ...validBody, padding: "x".repeat(5000) }),
      ),
      413,
    )
  })

  it("returns 401 and no cookie for a well-formed but unverifiable proof", async () => {
    expectNoSession(await postRaw(JSON.stringify(validBody)), 401)
  })

  it("fails closed without a session secret", async () => {
    vi.stubEnv("API_POW_SESSION_SECRET", "")
    expectNoSession(await postRaw(JSON.stringify(validBody)), 401)
  })

  it("returns 503 when the canonical origin is misconfigured", async () => {
    vi.stubEnv("API_OWNERSHIP_ORIGIN", "http://localhost:3000/")
    expectNoSession(await postRaw(JSON.stringify(validBody)), 503)
  })
})
