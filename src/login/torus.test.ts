import { randomBytes } from "node:crypto"
import type { CustomAuthLoginParams } from "@toruslabs/customauth"
import { keccak256, toUtf8Bytes } from "ethers"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getTorusSession, torusLogin } from "./torus"

const sdk = vi.hoisted(() => ({
  constructor: vi.fn(),
  init: vi.fn(),
  triggerLogin: vi.fn(),
  getRedirectResult: vi.fn(),
  getPrivateKeySession: vi.fn(),
}))

vi.mock("@toruslabs/customauth", () => ({
  CustomAuth: class {
    init = sdk.init
    triggerLogin = sdk.triggerLogin
    getRedirectResult = sdk.getRedirectResult

    constructor(args: unknown) {
      sdk.constructor(args)
    }
  },
}))

vi.mock("./adapters/privatekey", () => ({
  getPrivateKeySession: sdk.getPrivateKeySession,
}))

const google: CustomAuthLoginParams = {
  authConnection: "google",
  authConnectionId: "google-sub-verifier",
  groupedAuthConnectionId: "google-aggregate-verifier",
  clientId: "google-client",
}

describe("CustomAuth v22 integration", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal("window", {
      location: { origin: "https://wallet.example" },
      addEventListener: vi.fn(),
    })
    sdk.init.mockResolvedValue(undefined)
    sdk.triggerLogin.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it.each([
    "mainnet",
    "testnet",
  ] as const)("keeps the redirect callback and service-worker-free setup on %s", async (network) => {
    await torusLogin(network, "web3auth-client", google)

    expect(sdk.constructor).toHaveBeenCalledWith({
      uxMode: "redirect",
      baseUrl: "https://wallet.example",
      redirectPathName: "Welcome/Auth",
      network,
      web3AuthClientId: "web3auth-client",
    })
    expect(sdk.init).toHaveBeenCalledWith({ skipSw: true })
    expect(sdk.triggerLogin).toHaveBeenCalledWith(google)
  })

  it.each([
    "google",
    "facebook",
    "custom",
  ] as const)("reads the unified %s result and preserves the final wallet key", async (authConnection) => {
    const privKey = randomBytes(32).toString("hex")
    const session = { sessionOrigin: "torus" }
    sdk.getRedirectResult.mockResolvedValue({
      result: {
        finalKeyData: { privKey },
        oAuthKeyData: { privKey: randomBytes(32).toString("hex") },
        userInfo: {
          authConnection,
          name: "Test User",
          profileImage: "https://wallet.example/avatar.png",
        },
      },
    })
    sdk.getPrivateKeySession.mockResolvedValue(session)

    const result = await getTorusSession("mainnet", "web3auth-client")

    expect(sdk.getRedirectResult).toHaveBeenCalledWith({
      replaceUrl: false,
      clearLoginDetails: false,
    })
    expect(sdk.getPrivateKeySession).toHaveBeenCalledWith(
      privKey,
      "torus",
      authConnection === "custom" ? "jwt" : authConnection,
      "Test User",
      "https://wallet.example/avatar.png",
    )
    expect(result).toBe(session)
  })

  it("surfaces provider errors without deriving a wallet", async () => {
    sdk.getRedirectResult.mockResolvedValue({ error: "Access denied" })

    await expect(getTorusSession("mainnet", "web3auth-client")).rejects.toThrow(
      "Access denied",
    )
    expect(sdk.getPrivateKeySession).not.toHaveBeenCalled()
  })

  it("rejects a redirect without user info", async () => {
    sdk.getRedirectResult.mockResolvedValue({ result: {} })

    await expect(getTorusSession("mainnet", "web3auth-client")).rejects.toThrow(
      "No user info in Torus login result",
    )
    expect(sdk.getPrivateKeySession).not.toHaveBeenCalled()
  })

  it.each([
    undefined,
    "",
  ])("rejects a missing or empty final key (%s)", async (privKey) => {
    sdk.getRedirectResult.mockResolvedValue({
      result: {
        finalKeyData: { privKey },
        oAuthKeyData: { privKey: randomBytes(32).toString("hex") },
        userInfo: { authConnection: "google" },
      },
    })

    await expect(getTorusSession("mainnet", "web3auth-client")).rejects.toThrow(
      "no privateKey from google",
    )
    expect(sdk.getPrivateKeySession).not.toHaveBeenCalled()
  })

  it("propagates initialization, login, and redirect failures", async () => {
    sdk.init.mockRejectedValueOnce(new Error("Initialization failed"))
    await expect(
      torusLogin("mainnet", "web3auth-client", google),
    ).rejects.toThrow("Initialization failed")
    expect(sdk.triggerLogin).not.toHaveBeenCalled()

    sdk.triggerLogin.mockRejectedValueOnce(new Error("Login failed"))
    await expect(
      torusLogin("mainnet", "web3auth-client", google),
    ).rejects.toThrow("Login failed")

    sdk.getRedirectResult.mockRejectedValueOnce(
      new Error("Session unavailable"),
    )
    await expect(getTorusSession("mainnet", "web3auth-client")).rejects.toThrow(
      "Session unavailable",
    )
  })

  it("maps existing provider environment values to the v22 fields", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID", "test-project")
    vi.stubEnv("NEXT_PUBLIC_WEB3AUTH_GOOGLE_CLIENTID", "google-client")
    vi.stubEnv(
      "NEXT_PUBLIC_WEB3AUTH_GOOGLE_VERIFIER",
      "google-aggregate-verifier",
    )
    vi.stubEnv("NEXT_PUBLIC_WEB3AUTH_GOOGLE_SUBVERIFIER", "google-sub-verifier")
    vi.stubEnv("NEXT_PUBLIC_WEB3AUTH_FACEBOOK_CLIENTID", "facebook-client")
    vi.stubEnv("NEXT_PUBLIC_WEB3AUTH_FACEBOOK_VERIFIER", "facebook-verifier")
    vi.stubEnv("NEXT_PUBLIC_WEB3AUTH_AUTH0_CLIENTID", "auth0-client")
    vi.stubEnv("NEXT_PUBLIC_WEB3AUTH_AUTH0_VERIFIER", "auth0-verifier")
    vi.stubEnv("NEXT_PUBLIC_WEB3AUTH_AUTH0_DOMAIN", "https://auth.example")

    const { config } = await import("../../config")

    expect(config.torus.providers).toEqual({
      google,
      facebook: {
        clientId: "facebook-client",
        authConnectionId: "facebook-verifier",
        authConnection: "facebook",
      },
      pwdless: {
        clientId: "auth0-client",
        authConnectionId: "auth0-verifier",
        authConnection: "custom",
        jwtParams: {
          connection: "",
          domain: "https://auth.example",
          userIdField: "name",
        },
      },
    })
  })

  it("supports the configured callback and key type in the installed SDK", async () => {
    const { CustomAuth } = await vi.importActual<
      typeof import("@toruslabs/customauth")
    >("@toruslabs/customauth")
    const torus = new CustomAuth({
      baseUrl: "https://wallet.example",
      redirectPathName: "Welcome/Auth",
      uxMode: "redirect",
      network: "mainnet",
      web3AuthClientId: "web3auth-client",
    })

    expect(torus.config.redirect_uri).toBe(
      "https://wallet.example/Welcome/Auth",
    )
    expect(torus.config.keyType).toBe("secp256k1")
    expect(torus.triggerLogin).toBeTypeOf("function")
    expect(torus.getRedirectResult).toBeTypeOf("function")
  })

  it("preserves Google's single-sub-verifier key request in the installed SDK", async () => {
    const { CustomAuth } = await vi.importActual<
      typeof import("@toruslabs/customauth")
    >("@toruslabs/customauth")
    const nodeDetails = {
      currentEpoch: "1",
      torusNodeEndpoints: [],
      torusNodePub: [],
      torusIndexes: [],
    }
    const torus = new CustomAuth({
      baseUrl: "https://wallet.example",
      network: "mainnet",
      web3AuthClientId: "web3auth-client",
      nodeDetails,
    })
    const stopRequest = new Error("Stop before contacting Torus nodes")
    const retrieveShares = vi
      .spyOn(torus.torus, "retrieveShares")
      .mockRejectedValue(stopRequest)
    const idToken = randomBytes(32).toString("hex")

    await expect(
      torus.getTorusKey({
        authConnection: "google",
        authConnectionId: google.authConnectionId,
        groupedAuthConnectionId: google.groupedAuthConnectionId,
        userId: "user@example.com",
        idToken,
      }),
    ).rejects.toBe(stopRequest)

    expect(retrieveShares).toHaveBeenCalledWith(
      expect.objectContaining({
        verifier: google.groupedAuthConnectionId,
        verifierParams: {
          verifier_id: "user@example.com",
          verify_params: [
            { verifier_id: "user@example.com", idtoken: idToken },
          ],
          sub_verifier_ids: [google.authConnectionId],
        },
        idToken: keccak256(toUtf8Bytes(idToken)).slice(2),
      }),
    )
  })
})
