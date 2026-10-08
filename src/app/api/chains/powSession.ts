import { z } from "zod"

import type { ChainFamily } from "@/chain/types"

import { normalizeOwnershipAddress, OwnershipScope } from "./ownershipProtocol"

const POW_CHALLENGE_TTL_MS = 5 * 60 * 1000
const POW_SESSION_TTL_MS = 30 * 60 * 1000
const POW_DIFFICULTY_PREFIX = "0000"
const POW_COOKIE_PREFIX = "gw_owner_v2_"

type SignedPayload<T extends string, P extends object> = {
  type: T
  payload: P
  expiresAt: number
}

type PowChallengePayload = {
  address: string
  difficultyPrefix: string
  family: ChainFamily
  audience: string
  issuedAt: number
}

type PowSessionPayload = PowChallengePayload

export const getOwnershipAudience = () => {
  const value =
    process.env.API_OWNERSHIP_ORIGIN ??
    (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "")
  const url = new URL(value)
  if (
    url.origin !== value ||
    (process.env.NODE_ENV === "production" && url.protocol !== "https:")
  ) {
    throw new Error(
      "Configure API_OWNERSHIP_ORIGIN as the canonical app origin",
    )
  }
  return value
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const encodeBase64Url = (bytes: Uint8Array) => {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

const decodeBase64Url = (value: string) => {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=")
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

const getPowSecret = () => {
  const secret = process.env.API_POW_SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("Missing API_POW_SESSION_SECRET env variable")
  }

  return secret
}

const constantTimeEqual = (left: string, right: string) => {
  if (left.length !== right.length) {
    return false
  }

  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return diff === 0
}

const importHmacKey = async () => {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getPowSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
}

const sign = async (value: string) => {
  const key = await importHmacKey()
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value))
  return encodeBase64Url(new Uint8Array(signature))
}

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value))
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
}

const createSignedToken = async <T extends string, P extends object>(
  type: T,
  payload: P,
  ttlMs: number,
  issuedAt = Date.now(),
) => {
  const expiresAt = issuedAt + ttlMs
  const tokenPayload: SignedPayload<T, P> = {
    type,
    payload,
    expiresAt,
  }

  const encodedPayload = encodeBase64Url(
    encoder.encode(JSON.stringify(tokenPayload)),
  )
  const signature = await sign(encodedPayload)

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt,
  }
}

const parseSignedToken = async <T extends string, P extends object>(
  token: string,
  expectedType: T,
) => {
  try {
    if (token.length > 2048 || token.split(".").length !== 2) return null
    const [encodedPayload, signature] = token.split(".")
    if (!encodedPayload || !signature) {
      return null
    }

    const expectedSignature = await sign(encodedPayload)
    if (!constantTimeEqual(signature, expectedSignature)) {
      return null
    }

    const payloadJson = decoder.decode(decodeBase64Url(encodedPayload))
    const parsed = JSON.parse(payloadJson) as SignedPayload<T, P>

    const scope = OwnershipScope.extend({
      audience: z.string(),
      issuedAt: z.number().int().nonnegative(),
      difficultyPrefix: z.literal(POW_DIFFICULTY_PREFIX),
    }).safeParse(parsed.payload)
    const ttl =
      expectedType === "ownership-challenge-v2"
        ? POW_CHALLENGE_TTL_MS
        : POW_SESSION_TTL_MS
    if (
      !scope.success ||
      parsed.type !== expectedType ||
      !Number.isSafeInteger(parsed.expiresAt) ||
      parsed.expiresAt !== scope.data.issuedAt + ttl ||
      scope.data.issuedAt > Date.now() ||
      parsed.expiresAt <= Date.now() ||
      scope.data.audience !== getOwnershipAudience()
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export const issuePowChallenge = async (
  family: ChainFamily,
  address: string,
) => {
  OwnershipScope.parse({ family, address })
  const normalizedAddress = normalizeOwnershipAddress(family, address)
  const issuedAt = Date.now()
  const challenge = await createSignedToken(
    "ownership-challenge-v2",
    {
      address: normalizedAddress,
      difficultyPrefix: POW_DIFFICULTY_PREFIX,
      family,
      audience: getOwnershipAudience(),
      issuedAt,
    } satisfies PowChallengePayload,
    POW_CHALLENGE_TTL_MS,
    issuedAt,
  )

  return {
    challenge: challenge.token,
    difficultyPrefix: POW_DIFFICULTY_PREFIX,
    expiresAt: challenge.expiresAt,
  }
}

export const verifyPowSolution = async (
  family: ChainFamily,
  address: string,
  challengeToken: string,
  nonce: number,
) => {
  const challenge = await parseSignedToken<
    "ownership-challenge-v2",
    PowChallengePayload
  >(challengeToken, "ownership-challenge-v2")

  if (!challenge || !Number.isSafeInteger(nonce) || nonce < 0) {
    return false
  }

  const normalizedAddress = normalizeOwnershipAddress(family, address)
  if (
    challenge.payload.address !== normalizedAddress ||
    challenge.payload.family !== family
  ) {
    return false
  }

  const powHash = await sha256Hex(
    `${normalizedAddress}:${challengeToken}:${nonce}`,
  )
  return powHash.startsWith(challenge.payload.difficultyPrefix)
}

// Called only after signature + PoW verification. Replay cannot extend expiry.
export const issuePowSession = async (challengeToken: string) => {
  const challenge = await parseSignedToken<
    "ownership-challenge-v2",
    PowChallengePayload
  >(challengeToken, "ownership-challenge-v2")
  if (!challenge) throw new Error("Expired ownership challenge")
  const session = await createSignedToken(
    "ownership-session-v2",
    challenge.payload,
    POW_SESSION_TTL_MS,
    challenge.payload.issuedAt,
  )

  return {
    token: session.token,
    expiresAt: session.expiresAt,
  }
}

export const getAddressSessionCookieName = async (
  family: string,
  address: string,
) => {
  const digest = await sha256Hex(
    `${family}:${normalizeOwnershipAddress(family, address)}`,
  )
  return `${POW_COOKIE_PREFIX}${digest.slice(0, 24)}`
}

export const verifyPowSessionCookie = async (
  token: string | undefined,
  family: string,
  address: string,
) => {
  if (!token) {
    return false
  }

  const session = await parseSignedToken<
    "ownership-session-v2",
    PowSessionPayload
  >(token, "ownership-session-v2")

  if (!session) {
    return false
  }

  return (
    session.payload.family === family &&
    session.payload.address === normalizeOwnershipAddress(family, address)
  )
}

export const isProtectedAddressReadPath = (pathname: string) => {
  return /\/api\/chains\/[^/]+\/addresses\/[^/]+\/(balance|history|utxos)$/.test(
    pathname,
  )
}

export const isTxLookupPath = (pathname: string) => {
  return (
    /\/api\/chains\/[^/]+\/transactions\/[^/]+$/.test(pathname) &&
    !pathname.endsWith("/broadcast")
  )
}
