import { z } from "zod"

import { type ChainFamily, isSupportedFamily } from "@/chain/types"

import { signOwnershipMessage } from "./clientOwnershipSignature"
import {
  normalizeOwnershipAddress,
  ownershipMessage,
} from "./ownershipProtocol"

const SESSION_STORAGE_PREFIX = "gw-ownership-v2:"

type ChallengeResponse = {
  challenge: string
  difficultyPrefix: string
  expiresAt: number
}

type SessionResponse = {
  ok: true
  expiresAt: number
}

const inFlightSessions = new Map<string, Promise<void>>()

const normalizeAddress = (address: string) => {
  return /^0x/i.test(address) ? address.toLowerCase() : address
}

const getSessionStorageKey = (address: string) => {
  return `${SESSION_STORAGE_PREFIX}${normalizeAddress(address)}`
}

const getStoredExpiry = (address: string) => {
  if (typeof window === "undefined") {
    return null
  }

  const rawValue = window.sessionStorage.getItem(getSessionStorageKey(address))
  if (!rawValue) {
    return null
  }

  const parsedExpiry = Number(rawValue)
  return Number.isFinite(parsedExpiry) ? parsedExpiry : null
}

const setStoredExpiry = (address: string, expiresAt: number) => {
  if (typeof window === "undefined") {
    return
  }

  window.sessionStorage.setItem(
    getSessionStorageKey(address),
    String(expiresAt),
  )
}

const clearStoredExpiry = (address: string) => {
  if (typeof window === "undefined") {
    return
  }

  window.sessionStorage.removeItem(getSessionStorageKey(address))
}

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
}

const solveProofOfWork = async (
  address: string,
  challenge: ChallengeResponse,
) => {
  let nonce = 0
  const normalizedAddress = normalizeAddress(address)

  while (Date.now() < challenge.expiresAt) {
    const hash = await sha256Hex(
      `${normalizedAddress}:${challenge.challenge}:${nonce}`,
    )
    if (hash.startsWith(challenge.difficultyPrefix)) {
      return nonce
    }
    nonce += 1
  }

  throw new Error("Proof-of-work challenge expired before completion")
}

const createAddressSession = async (family: ChainFamily, address: string) => {
  const normalizedAddress = normalizeOwnershipAddress(family, address)
  const challengeResponse = await fetch(
    `/api/chains/auth/address?family=${family}&address=${encodeURIComponent(normalizedAddress)}`,
    {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    },
  )

  if (!challengeResponse.ok) {
    throw new Error(
      `Failed to request address challenge: ${challengeResponse.status}`,
    )
  }

  const challenge = z
    .object({
      challenge: z.string().max(2048),
      difficultyPrefix: z.literal("0000"),
      expiresAt: z.number().int(),
    })
    .parse(await challengeResponse.json())
  const encoded = challenge.challenge
    .split(".")[0]
    .replace(/-/g, "+")
    .replace(/_/g, "/")
  const payload = JSON.parse(atob(encoded))
  if (
    payload.type !== "ownership-challenge-v2" ||
    payload.payload?.address !== normalizedAddress ||
    payload.payload?.family !== family ||
    payload.payload?.audience !== window.location.origin ||
    !Number.isSafeInteger(payload.payload?.issuedAt) ||
    payload.expiresAt !== payload.payload.issuedAt + 5 * 60_000 ||
    payload.expiresAt !== challenge.expiresAt ||
    challenge.expiresAt <= Date.now() ||
    payload.payload.issuedAt > Date.now() + 30_000
  ) {
    throw new Error("Invalid ownership challenge scope")
  }
  const proof = await signOwnershipMessage(
    family,
    normalizedAddress,
    ownershipMessage(challenge.challenge),
  )
  const nonce = await solveProofOfWork(normalizedAddress, challenge)

  const sessionResponse = await fetch(`/api/chains/auth/address`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      family,
      address: normalizedAddress,
      challenge: challenge.challenge,
      nonce,
      ...proof,
    }),
  })

  if (!sessionResponse.ok) {
    throw new Error(
      `Failed to verify address challenge: ${sessionResponse.status}`,
    )
  }

  const session = (await sessionResponse.json()) as SessionResponse
  setStoredExpiry(`${family}:${normalizedAddress}`, session.expiresAt)
}

export const ensureAddressSession = async (
  family: ChainFamily,
  address: string,
  forceRefresh = false,
) => {
  const normalizedAddress = normalizeOwnershipAddress(family, address)
  const scope = `${family}:${normalizedAddress}`
  const storedExpiry = getStoredExpiry(scope)

  if (!forceRefresh && storedExpiry && storedExpiry > Date.now()) {
    return
  }

  const existing = inFlightSessions.get(scope)
  if (existing) {
    return existing
  }

  const promise = createAddressSession(family, normalizedAddress).finally(
    () => {
      inFlightSessions.delete(scope)
    },
  )

  inFlightSessions.set(scope, promise)
  return promise
}

export const fetchWithAddressSession = async (
  address: string,
  input: RequestInfo | URL,
  init?: RequestInit,
) => {
  const url = new URL(
    input instanceof Request ? input.url : String(input),
    window.location.origin,
  )
  const match = url.pathname.match(
    /^\/api\/chains\/([^/]+)\/(?:addresses\/([^/]+)\/(?:history|balance|utxos)|transactions\/[^/]+)$/,
  )
  const family = match?.[1]
  if (
    url.origin !== window.location.origin ||
    !family ||
    !isSupportedFamily(family)
  ) {
    throw new Error("Invalid ownership API URL")
  }
  const normalizedAddress = normalizeOwnershipAddress(family, address)
  const requestedAddress = match?.[2]
    ? decodeURIComponent(match[2])
    : url.searchParams.get("address")
  if (
    !requestedAddress ||
    normalizeOwnershipAddress(family, requestedAddress) !== normalizedAddress
  ) {
    throw new Error("Ownership API address mismatch")
  }
  await ensureAddressSession(family, normalizedAddress)

  let response = await fetch(input, {
    ...init,
    credentials: init?.credentials ?? "same-origin",
  })

  if (response.status === 401) {
    clearStoredExpiry(`${family}:${normalizedAddress}`)
    await ensureAddressSession(family, normalizedAddress, true)
    response = await fetch(input, {
      ...init,
      credentials: init?.credentials ?? "same-origin",
    })
  }

  return response
}
