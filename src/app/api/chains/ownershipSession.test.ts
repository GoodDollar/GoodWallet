import { NextRequest, type NextResponse } from "next/server"
import { createHash, createHmac, randomBytes } from "node:crypto"
import { Wallet } from "ethers/wallet"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { proxy } from "@/proxy"

import { GET, POST } from "./auth/address/route"
import {
  normalizeOwnershipAddress,
  ownershipMessage,
} from "./ownershipProtocol"
import {
  getAddressSessionCookieName,
  issuePowChallenge,
  verifyPowSessionCookie,
  verifyPowSolution,
} from "./powSession"

const ORIGIN = "http://localhost:3000"
const ISSUED_AT = Date.UTC(2026, 9, 5, 12)
const CHALLENGE_TTL = 5 * 60_000
const SESSION_TTL = 30 * 60_000
// Ephemeral test-only credentials: never persisted or sent to a provider.
const secret = randomBytes(32).toString("hex")
const wallet = Wallet.createRandom()
const otherWallet = Wallet.createRandom()

type Token = {
  type: string
  payload: {
    family: string
    address: string
    audience: string
    issuedAt: number
    difficultyPrefix: string
  }
  expiresAt: number
}

type Proof = {
  family: string
  address: string
  challenge: string
  nonce: number
  signature: string
}

const decodeToken = (token: string): Token =>
  JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"))

// Valid HMACs let negative tests reach schema/expiry/audience checks rather
// than being rejected only for a broken MAC. Production signing is not mocked.
const authenticatePayload = (encoded: string) =>
  `${encoded}.${createHmac("sha256", secret).update(encoded).digest("base64url")}`

const signToken = (token: unknown) =>
  authenticatePayload(Buffer.from(JSON.stringify(token)).toString("base64url"))

const solvePow = (address: string, challenge: string, family = "EVM") => {
  const prefix = `${normalizeOwnershipAddress(family, address)}:${challenge}:`
  for (let nonce = 0; ; nonce += 1) {
    if (
      createHash("sha256")
        .update(`${prefix}${nonce}`)
        .digest("hex")
        .startsWith("0000")
    ) {
      return nonce
    }
  }
}

const makeProof = async (challenge: string): Promise<Proof> => ({
  family: "EVM",
  address: wallet.address,
  challenge,
  nonce: solvePow(wallet.address, challenge),
  signature: await wallet.signMessage(ownershipMessage(challenge)),
})

const post = (body: unknown, origin: string | null = ORIGIN) =>
  POST(
    new NextRequest(`${ORIGIN}/api/chains/auth/address`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(origin === null ? {} : { Origin: origin }),
      },
      body: JSON.stringify(body),
    }),
  )

const expectRejected = async (response: NextResponse, status: number) => {
  expect(response.status).toBe(status)
  expect(response.headers.get("set-cookie")).toBeNull()
  expect(response.headers.get("cache-control")).toBe("private, no-store")
}

let proof: Proof
let sessionToken: string
let cookieName: string
let requestId = 0

beforeAll(async () => {
  vi.stubEnv("API_OWNERSHIP_ORIGIN", ORIGIN)
  vi.stubEnv("API_POW_SESSION_SECRET", secret)
  const clock = vi.spyOn(Date, "now").mockReturnValue(ISSUED_AT)
  try {
    const response = await GET(
      new NextRequest(
        `${ORIGIN}/api/chains/auth/address?family=EVM&address=${wallet.address}`,
        { headers: { Origin: ORIGIN } },
      ),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    const challenge = await response.json()
    expect(challenge.difficultyPrefix).toBe("0000")
    expect(challenge.expiresAt).toBe(ISSUED_AT + CHALLENGE_TTL)
    proof = await makeProof(challenge.challenge)
    cookieName = await getAddressSessionCookieName("EVM", wallet.address)
    const verified = await post(proof)
    expect(verified.status).toBe(200)
    sessionToken = verified.cookies.get(cookieName)!.value
  } finally {
    clock.mockRestore()
    vi.unstubAllEnvs()
  }
})

beforeEach(() => {
  vi.stubEnv("API_OWNERSHIP_ORIGIN", ORIGIN)
  vi.stubEnv("API_POW_SESSION_SECRET", secret)
  vi.spyOn(Date, "now").mockReturnValue(ISSUED_AT)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe("ownership challenge and POST session flow", () => {
  it("accepts real EVM signatures and SHA-256 work and sets a scoped HttpOnly cookie", async () => {
    expect(decodeToken(proof.challenge)).toEqual({
      type: "ownership-challenge-v2",
      payload: {
        family: "EVM",
        address: wallet.address.toLowerCase(),
        audience: ORIGIN,
        issuedAt: ISSUED_AT,
        difficultyPrefix: "0000",
      },
      expiresAt: ISSUED_AT + CHALLENGE_TTL,
    })
    expect(
      await verifyPowSolution(
        "EVM",
        wallet.address,
        proof.challenge,
        proof.nonce,
      ),
    ).toBe(true)
    const response = await post({
      ...proof,
      address: wallet.address.toLowerCase(),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      expiresAt: ISSUED_AT + SESSION_TTL,
    })
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.cookies.get(cookieName)).toMatchObject({
      value: sessionToken,
      httpOnly: true,
      sameSite: "lax",
      path: "/api/chains",
      expires: new Date(ISSUED_AT + SESSION_TTL),
    })
    expect(cookieName).toMatch(/^gw_owner_v2_[a-f0-9]{24}$/)
    expect(
      await getAddressSessionCookieName("EVM", wallet.address.toLowerCase()),
    ).toBe(cookieName)
    expect(
      await verifyPowSessionCookie(sessionToken, "EVM", wallet.address),
    ).toBe(true)
    expect(
      await verifyPowSessionCookie(
        sessionToken,
        "EVM",
        wallet.address.toLowerCase(),
      ),
    ).toBe(true)
  })

  it("rejects the former PoW-only POST with no ownership signature", async () => {
    const { signature: _signature, ...powOnly } = proof
    await expectRejected(await post(powOnly), 400)
  })

  it.each([
    "wrong signer",
    "wrong message",
    "malformed",
  ])("rejects a %s signature despite valid work", async (kind) => {
    const signature =
      kind === "wrong signer"
        ? await otherWallet.signMessage(ownershipMessage(proof.challenge))
        : kind === "wrong message"
          ? await wallet.signMessage(
              `${ownershipMessage(proof.challenge)}tampered`,
            )
          : "not-a-signature"
    await expectRejected(await post({ ...proof, signature }), 401)
  })

  it.each([
    "address",
    "family",
  ])("rejects proof submitted for the wrong %s even with recomputed work", async (field) => {
    const address = field === "address" ? otherWallet.address : wallet.address
    const family = field === "family" ? "BTC" : "EVM"
    const nonce = solvePow(address, proof.challenge, family)
    expect(
      await verifyPowSolution(family, address, proof.challenge, nonce),
    ).toBe(false)
    await expectRejected(await post({ ...proof, address, family, nonce }), 401)
  })

  it("rejects incorrect work even with a genuine signature", async () => {
    let nonce = proof.nonce + 1
    while (
      await verifyPowSolution("EVM", wallet.address, proof.challenge, nonce)
    )
      nonce += 1
    await expectRejected(await post({ ...proof, nonce }), 401)
  })

  it.each([
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])("rejects invalid nonce %s", async (nonce) => {
    expect(
      await verifyPowSolution("EVM", wallet.address, proof.challenge, nonce),
    ).toBe(false)
    await expectRejected(await post({ ...proof, nonce }), 400)
  })

  it.each([
    null,
    "https://other.example",
  ])("rejects missing or wrong Origin: %s", async (origin) => {
    await expectRejected(await post(proof, origin), 403)
  })

  it("rejects a challenge exactly at expiry", async () => {
    vi.mocked(Date.now).mockReturnValue(ISSUED_AT + CHALLENGE_TTL)
    await expectRejected(await post(proof), 401)
  })

  it("rejects a genuinely issued challenge from the future", async () => {
    vi.mocked(Date.now).mockReturnValue(ISSUED_AT + 1)
    const future = await issuePowChallenge("EVM", wallet.address)
    const futureProof = await makeProof(future.challenge)
    vi.mocked(Date.now).mockReturnValue(ISSUED_AT)
    await expectRejected(await post(futureProof), 401)
  })

  it("rejects payload tampering even with fresh PoW and the owner's signature", async () => {
    const payload = decodeToken(proof.challenge)
    payload.payload.address = otherWallet.address.toLowerCase()
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")
    const tampered = `${encoded}.${proof.challenge.split(".")[1]}`
    await expectRejected(await post(await makeProof(tampered)), 401)
  })

  it("rejects a correctly authenticated challenge for the wrong audience", async () => {
    const payload = decodeToken(proof.challenge)
    payload.payload.audience = "https://other.example"
    await expectRejected(await post(await makeProof(signToken(payload))), 401)
  })

  it("replay never extends expiry beyond challenge issuedAt + 30 minutes", async () => {
    vi.mocked(Date.now).mockReturnValue(ISSUED_AT + 60_000)
    const first = await post(proof)
    vi.mocked(Date.now).mockReturnValue(ISSUED_AT + CHALLENGE_TTL - 1)
    const replay = await post(proof)
    for (const response of [first, replay]) {
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({
        ok: true,
        expiresAt: ISSUED_AT + SESSION_TTL,
      })
      expect(response.cookies.get(cookieName)?.value).toBe(sessionToken)
      expect(
        new Date(response.cookies.get(cookieName)!.expires!).getTime(),
      ).toBe(ISSUED_AT + SESSION_TTL)
    }
    expect(decodeToken(sessionToken).payload.issuedAt).toBe(ISSUED_AT)
    vi.mocked(Date.now).mockReturnValue(ISSUED_AT + CHALLENGE_TTL)
    await expectRejected(await post(proof), 401)
    vi.mocked(Date.now).mockReturnValue(ISSUED_AT + SESSION_TTL - 1)
    expect(
      await verifyPowSessionCookie(sessionToken, "EVM", wallet.address),
    ).toBe(true)
    vi.mocked(Date.now).mockReturnValue(ISSUED_AT + SESSION_TTL)
    expect(
      await verifyPowSessionCookie(sessionToken, "EVM", wallet.address),
    ).toBe(false)
  })
})

describe("session token validation", () => {
  it.each([
    "address",
    "family",
  ])("rejects the wrong session %s", async (field) => {
    expect(
      await verifyPowSessionCookie(
        sessionToken,
        field === "family" ? "BTC" : "EVM",
        field === "address" ? otherWallet.address : wallet.address,
      ),
    ).toBe(false)
  })

  it.each([
    "pow-session",
    "pow-challenge",
    "ownership-challenge-v2",
  ])("rejects authenticated %s tokens as ownership cookies", async (type) => {
    // Even with a current payload and valid MAC, a legacy type cannot upgrade.
    const legacy = signToken({ ...decodeToken(sessionToken), type })
    expect(await verifyPowSessionCookie(legacy, "EVM", wallet.address)).toBe(
      false,
    )
  })

  it("rejects an old PoW-only cookie lacking ownership audience and issuedAt", async () => {
    const legacy = signToken({
      type: "pow-session",
      payload: { family: "EVM", address: wallet.address.toLowerCase() },
      expiresAt: ISSUED_AT + SESSION_TTL,
    })
    expect(await verifyPowSessionCookie(legacy, "EVM", wallet.address)).toBe(
      false,
    )
  })

  it.each([
    [
      "wrong audience",
      (token: Token) => {
        token.payload.audience = "https://other.example"
      },
    ],
    [
      "future issuedAt",
      (token: Token) => {
        token.payload.issuedAt += 1
        token.expiresAt += 1
      },
    ],
    [
      "extended expiry",
      (token: Token) => {
        token.expiresAt += 1
      },
    ],
    [
      "fractional expiry",
      (token: Token) => {
        token.expiresAt += 0.5
      },
    ],
    [
      "negative issuedAt",
      (token: Token) => {
        token.payload.issuedAt = -1
      },
    ],
    [
      "wrong difficulty",
      (token: Token) => {
        token.payload.difficultyPrefix = "0"
      },
    ],
    [
      "unknown family",
      (token: Token) => {
        token.payload.family = "UNKNOWN"
      },
    ],
    [
      "invalid address",
      (token: Token) => {
        token.payload.address = "invalid/address"
      },
    ],
  ] as const)("rejects a correctly authenticated token with %s", async (_label, mutate) => {
    for (const original of [proof.challenge, sessionToken]) {
      const token = decodeToken(original)
      mutate(token)
      const invalid = signToken(token)
      if (original === proof.challenge) {
        await expectRejected(await post(await makeProof(invalid)), 401)
      } else {
        expect(
          await verifyPowSessionCookie(invalid, "EVM", wallet.address),
        ).toBe(false)
      }
    }
  })

  it.each([
    ["empty", (): string => ""],
    ["missing separator", (): string => "invalid"],
    ["missing payload", (): string => ".signature"],
    ["missing MAC", (): string => "payload."],
    ["extra segment", () => `${sessionToken}.extra`],
    ["oversized", () => "x".repeat(2049)],
    ["invalid MAC", () => `${sessionToken.split(".")[0]}.invalid`],
    ["authenticated invalid base64", () => authenticatePayload("%%%")],
    [
      "authenticated invalid JSON",
      () => authenticatePayload(Buffer.from("{").toString("base64url")),
    ],
    ["authenticated null", () => signToken(null)],
    ["authenticated empty object", () => signToken({})],
    ["authenticated array", () => signToken([])],
  ] as const)("rejects malformed tokens: %s", async (_label, tokenFor) => {
    const token = tokenFor()
    expect(await verifyPowSessionCookie(token, "EVM", wallet.address)).toBe(
      false,
    )
    expect(await verifyPowSolution("EVM", wallet.address, token, 0)).toBe(false)
    await expectRejected(
      await post({ ...proof, challenge: token }),
      token.length === 0 || token.length > 2048 ? 400 : 401,
    )
  })

  it("rejects absent cookies", async () => {
    expect(await verifyPowSessionCookie(undefined, "EVM", wallet.address)).toBe(
      false,
    )
  })
})

// Origin + Host exercise the actual same-origin check. Give each request its
// own test IP so rate limiting cannot mask the ownership guard's response.
const guardedRead = async (
  endpoint: string,
  family = "EVM",
  address = wallet.address,
  token?: string,
  suppliedCookieName?: string,
) => {
  const name =
    suppliedCookieName ?? (await getAddressSessionCookieName(family, address))
  return proxy(
    new NextRequest(
      `${ORIGIN}/api/chains/${family}/addresses/${address}/${endpoint}`,
      {
        headers: {
          Origin: ORIGIN,
          Host: "localhost:3000",
          "x-real-ip": `ownership-test-${++requestId}`,
          ...(token === undefined ? {} : { Cookie: `${name}=${token}` }),
        },
      },
    ),
  )
}

describe("proxy address ownership guards", () => {
  it.each([
    "balance",
    "history",
    "utxos",
  ])("guards %s with the exact family/address cookie", async (endpoint) => {
    const allowed = await guardedRead(
      endpoint,
      "EVM",
      wallet.address.toLowerCase(),
      sessionToken,
    )
    expect(allowed.status).toBe(200)
    expect(allowed.headers.get("x-middleware-next")).toBe("1")

    for (const response of [
      await guardedRead(endpoint),
      await guardedRead(endpoint, "EVM", wallet.address, "malformed"),
      // Put the real token under the target cookie name: prove scope checking,
      // not merely absence of the cookie belonging to the other scope.
      await guardedRead(endpoint, "EVM", otherWallet.address, sessionToken),
      await guardedRead(endpoint, "BTC", wallet.address, sessionToken),
    ]) {
      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({
        message: "Address session required",
      })
      expect(response.headers.get("x-middleware-next")).toBeNull()
    }
  })

  it("does not accept old cookie names or authenticated PoW-only tokens", async () => {
    const legacy = signToken({
      ...decodeToken(sessionToken),
      type: "pow-session",
    })
    const legacyName = cookieName.replace("gw_owner_v2_", "gw_pow_")
    expect(
      (
        await guardedRead(
          "balance",
          "EVM",
          wallet.address,
          sessionToken,
          legacyName,
        )
      ).status,
    ).toBe(401)
    expect(
      (await guardedRead("balance", "EVM", wallet.address, legacy)).status,
    ).toBe(401)
  })

  it("rejects expired sessions at the proxy", async () => {
    vi.mocked(Date.now).mockReturnValue(ISSUED_AT + SESSION_TTL)
    expect(
      (await guardedRead("balance", "EVM", wallet.address, sessionToken))
        .status,
    ).toBe(401)
  })
})
