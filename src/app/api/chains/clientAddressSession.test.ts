import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ChainFamily } from "@/chain/types"

import { signOwnershipMessage } from "./clientOwnershipSignature"

vi.mock("./clientOwnershipSignature", () => ({
  signOwnershipMessage: vi.fn(),
}))

const ORIGIN = "https://wallet.example"
const NOW = Date.UTC(2026, 9, 5, 12)
const ADDRESS = "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01"
const NORMALIZED_ADDRESS = ADDRESS.toLowerCase()
const SESSION_EXPIRY = NOW + 30 * 60_000
const AUTH_URL = "/api/chains/auth/address"
const signature = "test-ownership-signature"
const sign = vi.mocked(signOwnershipMessage)
const fetchMock = vi.fn<typeof fetch>()
const digest = vi.fn<typeof crypto.subtle.digest>()

let client: typeof import("./clientAddressSession")
let storage: Storage
let challengeId: number

const readUrl = (family: ChainFamily = "EVM", address = ADDRESS) =>
  `/api/chains/${family}/addresses/${address}/balance`
const storageKey = (family: ChainFamily, address: string) =>
  `gw-ownership-v2:${family}:${address}`

// Node has no browser sessionStorage. Keep this stub and all globals local to
// each test, without modifying native Web Crypto or any production code.
const createStorage = (): Storage => {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      values.delete(key)
    }),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value)
    }),
  }
}

const makeChallenge = (
  family: ChainFamily = "EVM",
  address = NORMALIZED_ADDRESS,
  audience = ORIGIN,
) => {
  const expiresAt = NOW + 5 * 60_000
  const token = {
    type: "ownership-challenge-v2",
    payload: {
      family,
      address,
      audience,
      issuedAt: NOW,
      difficultyPrefix: "0000",
    },
    expiresAt,
  }
  // Real base64url JSON and a syntactically valid MAC segment. The client
  // validates scope/timestamps; MAC verification belongs to the server tests.
  const encoded = Buffer.from(JSON.stringify(token)).toString("base64url")
  const mac = Buffer.alloc(32, ++challengeId).toString("base64url")
  return { challenge: `${encoded}.${mac}`, difficultyPrefix: "0000", expiresAt }
}

const json = (body: unknown, status = 200) => Response.json(body, { status })

const mockSuccessfulFlow = () => {
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(String(input), ORIGIN)
    if (url.pathname === AUTH_URL) {
      if (init?.method === "POST") {
        return json({ ok: true, expiresAt: SESSION_EXPIRY })
      }
      return json(
        makeChallenge(
          url.searchParams.get("family") as ChainFamily,
          url.searchParams.get("address")!,
        ),
      )
    }
    return json({ balance: "123" })
  })
}

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(async () => {
  vi.resetModules()
  sign.mockReset().mockResolvedValue({ signature })
  fetchMock.mockReset()
  digest.mockReset().mockImplementation(async () => new Uint8Array(32).buffer)
  vi.spyOn(Date, "now").mockReturnValue(NOW)
  storage = createStorage()
  challengeId = 0
  vi.stubGlobal("window", {
    location: { origin: ORIGIN },
    sessionStorage: storage,
  })
  vi.stubGlobal("sessionStorage", storage)
  vi.stubGlobal("fetch", fetchMock)
  vi.stubGlobal("crypto", { subtle: { digest } })
  client = await import("./clientAddressSession")
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("client ownership session integration", () => {
  it.each(
    ChainFamily,
  )("signs and POSTs the scoped %s proof before reading", async (family) => {
    const address = family === "EVM" ? ADDRESS : "CaseSensitiveAddress123"
    const normalized = family === "EVM" ? NORMALIZED_ADDRESS : address
    const challenge = makeChallenge(family, normalized)
    const proof = { signature, publicKey: "test-public-key" }
    sign.mockResolvedValueOnce(proof)
    const readResponse = json({ balance: "123" })
    fetchMock
      .mockResolvedValueOnce(json(challenge))
      .mockResolvedValueOnce(json({ ok: true, expiresAt: SESSION_EXPIRY }))
      .mockResolvedValueOnce(readResponse)

    const url = readUrl(family, address)
    const response = await client.fetchWithAddressSession(address, url, {
      headers: { Accept: "application/json" },
    })

    expect(response).toBe(readResponse)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${AUTH_URL}?family=${family}&address=${encodeURIComponent(normalized)}`,
      { method: "GET", credentials: "same-origin", cache: "no-store" },
    )
    expect(sign).toHaveBeenCalledExactlyOnceWith(
      family,
      normalized,
      `GoodWallet API ownership v2\nAuthorize wallet-scoped blockchain reads only.\nChallenge: ${challenge.challenge}`,
    )
    expect(digest).toHaveBeenCalledExactlyOnceWith(
      "SHA-256",
      new TextEncoder().encode(`${normalized}:${challenge.challenge}:0`),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(2, AUTH_URL, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        family,
        address: normalized,
        challenge: challenge.challenge,
        nonce: 0,
        ...proof,
      }),
    })
    expect(fetchMock).toHaveBeenNthCalledWith(3, url, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
    expect(storage.getItem(storageKey(family, normalized))).toBe(
      String(SESSION_EXPIRY),
    )
  })

  it.each([
    ["address", "EVM", "0x0000000000000000000000000000000000000000", ORIGIN],
    ["family", "BTC", NORMALIZED_ADDRESS, ORIGIN],
    ["audience", "EVM", NORMALIZED_ADDRESS, "https://other.example"],
  ] as const)("rejects a challenge with the wrong %s before signing", async (_, family, address, audience) => {
    fetchMock.mockResolvedValueOnce(
      json(makeChallenge(family, address, audience)),
    )

    await expect(
      client.fetchWithAddressSession(ADDRESS, readUrl()),
    ).rejects.toThrow("Invalid ownership challenge scope")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sign).not.toHaveBeenCalled()
    expect(digest).not.toHaveBeenCalled()
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it.each([
    [
      "address",
      readUrl("EVM", "0x0000000000000000000000000000000000000000"),
      "Ownership API address mismatch",
    ],
    [
      "family",
      `/api/chains/UNKNOWN/addresses/${ADDRESS}/balance`,
      "Invalid ownership API URL",
    ],
    [
      "audience",
      `https://other.example${readUrl()}`,
      "Invalid ownership API URL",
    ],
  ])("rejects a read URL with the wrong %s without requesting a challenge", async (_, url, error) => {
    await expect(client.fetchWithAddressSession(ADDRESS, url)).rejects.toThrow(
      error,
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(sign).not.toHaveBeenCalled()
  })

  it("keeps challenges and cached sessions separate per family for the same address", async () => {
    mockSuccessfulFlow()
    const address = "SharedCaseSensitiveAddress123"
    for (const family of ["SOLANA", "SOLANA_DEVNET"] as const) {
      await client.fetchWithAddressSession(address, readUrl(family, address))
    }
    expect(sign).toHaveBeenCalledTimes(2)
    expect(sign.mock.calls.map(([family]) => family)).toEqual([
      "SOLANA",
      "SOLANA_DEVNET",
    ])
    expect(sign.mock.calls[0][2]).not.toBe(sign.mock.calls[1][2])
    expect(storage.getItem(storageKey("SOLANA", address))).toBe(
      String(SESSION_EXPIRY),
    )
    expect(storage.getItem(storageKey("SOLANA_DEVNET", address))).toBe(
      String(SESSION_EXPIRY),
    )
    expect(fetchMock).toHaveBeenCalledTimes(6)

    for (const family of ["SOLANA", "SOLANA_DEVNET"] as const) {
      await client.fetchWithAddressSession(address, readUrl(family, address))
    }
    expect(fetchMock).toHaveBeenCalledTimes(8)
    expect(sign).toHaveBeenCalledTimes(2)

    storage.setItem(storageKey("SOLANA", address), String(NOW - 1))
    await client.ensureAddressSession("SOLANA_DEVNET", address)
    expect(fetchMock).toHaveBeenCalledTimes(8)
    await client.ensureAddressSession("SOLANA", address)
    expect(fetchMock).toHaveBeenCalledTimes(10)
    expect(sign).toHaveBeenLastCalledWith("SOLANA", address, expect.any(String))
  })

  it("deduplicates concurrent normalized EVM sessions but still performs each read", async () => {
    mockSuccessfulFlow()
    const gate = deferred<{ signature: string }>()
    sign.mockReturnValueOnce(gate.promise)
    const first = client.fetchWithAddressSession(ADDRESS, readUrl())
    const second = client.fetchWithAddressSession(
      NORMALIZED_ADDRESS,
      readUrl("EVM", NORMALIZED_ADDRESS),
    )
    await vi.waitFor(() => expect(sign).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    gate.resolve({ signature })
    const responses = await Promise.all([first, second])
    expect(responses.every((response) => response.ok)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1)
    await client.ensureAddressSession("EVM", ADDRESS)
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it("does not deduplicate in-flight sessions across families", async () => {
    mockSuccessfulFlow()
    const address = "SharedCaseSensitiveAddress123"
    const gate = deferred<{ signature: string }>()
    sign.mockReturnValue(gate.promise)
    const first = client.ensureAddressSession("SOLANA", address)
    const second = client.ensureAddressSession("SOLANA_DEVNET", address)
    await vi.waitFor(() => expect(sign).toHaveBeenCalledTimes(2))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    gate.resolve({ signature })
    await Promise.all([first, second])
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(storage.length).toBe(2)
  })

  it.each([
    200, 401,
  ])("refreshes and retries exactly once after 401, even when the retry returns %s", async (status) => {
    const key = storageKey("EVM", NORMALIZED_ADDRESS)
    storage.setItem(key, String(SESSION_EXPIRY))
    const retried = json({ status }, status)
    fetchMock
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json(makeChallenge()))
      .mockResolvedValueOnce(json({ ok: true, expiresAt: SESSION_EXPIRY + 1 }))
      .mockResolvedValueOnce(retried)

    const response = await client.fetchWithAddressSession(ADDRESS, readUrl())
    expect(response).toBe(retried)
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      readUrl(),
      `${AUTH_URL}?family=EVM&address=${NORMALIZED_ADDRESS}`,
      AUTH_URL,
      readUrl(),
    ])
    expect(storage.removeItem).toHaveBeenCalledExactlyOnceWith(key)
    expect(sign).toHaveBeenCalledTimes(1)
    expect(storage.getItem(key)).toBe(String(SESSION_EXPIRY + 1))
  })

  it("returns 429 without retrying, clearing the session, or fetching a fresh challenge", async () => {
    mockSuccessfulFlow()
    await client.ensureAddressSession("EVM", ADDRESS)
    const rateLimited = json({ error: "rate limited" }, 429)
    fetchMock.mockResolvedValueOnce(rateLimited)

    expect(await client.fetchWithAddressSession(ADDRESS, readUrl())).toBe(
      rateLimited,
    )
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(sign).toHaveBeenCalledTimes(1)
    expect(storage.removeItem).not.toHaveBeenCalled()
    expect(storage.getItem(storageKey("EVM", NORMALIZED_ADDRESS))).toBe(
      String(SESSION_EXPIRY),
    )
  })

  it.each([
    "challenge",
    "session",
  ] as const)("does not retry a 429 from the %s endpoint", async (stage) => {
    if (stage === "session")
      fetchMock.mockResolvedValueOnce(json(makeChallenge()))
    fetchMock.mockResolvedValueOnce(json({}, 429))

    await expect(
      client.fetchWithAddressSession(ADDRESS, readUrl()),
    ).rejects.toThrow(
      stage === "challenge"
        ? "Failed to request address challenge: 429"
        : "Failed to verify address challenge: 429",
    )
    expect(fetchMock).toHaveBeenCalledTimes(stage === "challenge" ? 1 : 2)
    expect(sign).toHaveBeenCalledTimes(stage === "challenge" ? 0 : 1)
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it("propagates signer rejection without a session POST or read and clears in-flight state", async () => {
    mockSuccessfulFlow()
    const rejection = new Error("User rejected ownership signing")
    sign.mockRejectedValueOnce(rejection)

    await expect(
      client.fetchWithAddressSession(ADDRESS, readUrl()),
    ).rejects.toBe(rejection)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sign).toHaveBeenCalledTimes(1)
    expect(digest).not.toHaveBeenCalled()
    expect(storage.setItem).not.toHaveBeenCalled()

    // A later user action must be able to try again, rather than reuse a
    // permanently rejected in-flight promise.
    expect((await client.fetchWithAddressSession(ADDRESS, readUrl())).ok).toBe(
      true,
    )
    expect(sign).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })
})
