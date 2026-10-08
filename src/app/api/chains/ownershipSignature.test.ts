import { createHash, randomBytes } from "node:crypto"
import * as ecc from "@bitcoinerlab/secp256k1"
import { networks, payments } from "bitcoinjs-lib"
import { Wallet } from "ethers/wallet"
import {
  deriveAddress,
  deriveKeypair,
  generateSeed,
  sign,
} from "ripple-keypairs"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { ChainFamily } from "@/chain/types"
import { dogeNetwork, dogeTestNetwork } from "@/login/adapters/bitcoinNetworks"
import { getPrivateKeySession } from "@/login/adapters/privatekey"
import type { ISignerSession } from "@/login/types"

import { signOwnershipMessage } from "./clientOwnershipSignature"
import { verifyOwnershipSignature } from "./ownershipSignature"

vi.mock("@/config", () => ({ config: { includeTestnetTokens: true } }))
vi.mock("@/login/context/SessionContext/storage", () => ({
  sessionState: { session: null },
}))

const messageFor = (family: ChainFamily, address: string) =>
  `GoodWallet wallet login v2\n${JSON.stringify({
    family,
    address,
    nonce: randomBytes(32).toString("hex"),
    expiresAt: Date.now() + 60_000,
  })}`

describe("ownership signatures", () => {
  let session: ISignerSession
  let otherSession: ISignerSession

  beforeAll(async () => {
    // Ephemeral test-only seeds; never persisted or logged.
    session = await getPrivateKeySession(
      randomBytes(32).toString("hex"),
      "test",
      "test",
    )
    otherSession = await getPrivateKeySession(
      randomBytes(32).toString("hex"),
      "test",
      "test",
    )
    const { sessionState } = await import(
      "@/login/context/SessionContext/storage"
    )
    sessionState.session = session
  })

  it.each(
    ChainFamily,
  )("signs and verifies exact %s address/message", async (family) => {
    const signer = session.signer[family]!
    const message = messageFor(family, signer.address)
    const proof = await signOwnershipMessage(family, signer.address, message)
    expect(
      await verifyOwnershipSignature(
        family,
        signer.address,
        message,
        proof.signature,
        proof.publicKey,
      ),
    ).toBe(true)
    expect(
      await verifyOwnershipSignature(
        family,
        signer.address,
        `${message}tampered`,
        proof.signature,
        proof.publicKey,
      ),
    ).toBe(false)
    expect(
      await verifyOwnershipSignature(
        family,
        otherSession.signer[family]!.address,
        message,
        proof.signature,
        proof.publicKey,
      ),
    ).toBe(false)
    expect(
      await verifyOwnershipSignature(
        family,
        signer.address,
        message,
        "invalid",
        proof.publicKey,
      ),
    ).toBe(false)
    expect(
      await verifyOwnershipSignature(
        family,
        signer.address,
        "not an auth message",
        proof.signature,
        proof.publicKey,
      ),
    ).toBe(false)
    await expect(
      signOwnershipMessage(
        family,
        otherSession.signer[family]!.address,
        message,
      ),
    ).rejects.toThrow("address mismatch")
    await expect(
      signOwnershipMessage(family, signer.address, "raw transaction digest"),
    ).rejects.toThrow("domain")
  })

  it.each([
    "BTC",
    "BTC_TESTNET",
    "DOGE",
    "DOGE_TESTNET",
    "XRP",
    "XRP_TESTNET",
  ] as const)("%s auth-only signer rejects non-domain text and binds the public key", async (family) => {
    const signer = session.signer[family]!
    await expect(
      signer.signAuthMessage!(randomBytes(32).toString("hex")),
    ).rejects.toThrow("domain")
    const message = messageFor(family, signer.address)
    const signature = await signer.signAuthMessage!(message)
    expect(
      await verifyOwnershipSignature(
        family,
        signer.address,
        message,
        signature,
      ),
    ).toBe(false)
    expect(
      await verifyOwnershipSignature(
        family,
        signer.address,
        message,
        signature,
        otherSession.signer[family]!.publicKey,
      ),
    ).toBe(false)
    expect(
      await verifyOwnershipSignature(
        family,
        signer.address,
        message,
        `${signature}00`,
        signer.publicKey,
      ),
    ).toBe(false)
    expect(
      await verifyOwnershipSignature(
        family,
        signer.address,
        message,
        signature,
        `${signer.publicKey}zz`,
      ),
    ).toBe(false)
  })

  it.each([
    "BTC",
    "BTC_TESTNET",
    "DOGE",
    "DOGE_TESTNET",
  ] as const)("%s uses compact SHA256 ECDSA and the correct address network", async (family) => {
    const signer = session.signer[family]!
    const message = messageFor(family, signer.address)
    const signature = await signer.signAuthMessage!(message)
    expect(signature).toMatch(/^[0-9a-f]{128}$/i)
    expect(
      ecc.verify(
        createHash("sha256").update(message).digest(),
        Buffer.from(signer.publicKey, "hex"),
        Buffer.from(signature, "hex"),
      ),
    ).toBe(true)
    for (const otherFamily of [
      "BTC",
      "BTC_TESTNET",
      "DOGE",
      "DOGE_TESTNET",
    ] as const) {
      if (otherFamily !== family) {
        expect(
          await verifyOwnershipSignature(
            otherFamily,
            signer.address,
            message,
            signature,
            signer.publicKey,
          ),
        ).toBe(false)
      }
    }
    const network = {
      BTC: networks.bitcoin,
      BTC_TESTNET: networks.testnet,
      DOGE: dogeNetwork,
      DOGE_TESTNET: dogeTestNetwork,
    }[family]
    const payment = family.startsWith("BTC") ? payments.p2wpkh : payments.p2pkh
    expect(
      payment({ pubkey: Buffer.from(signer.publicKey, "hex"), network })
        .address,
    ).toBe(signer.address)
  })

  it("accepts EVM case normalization but rejects invalid addresses", async () => {
    const { address } = session.signer.EVM
    const message = messageFor("EVM", address)
    const { signature } = await signOwnershipMessage(
      "EVM",
      address.toLowerCase(),
      message,
    )
    expect(
      await verifyOwnershipSignature(
        "EVM",
        address.toLowerCase(),
        message,
        signature,
      ),
    ).toBe(true)
    expect(
      await verifyOwnershipSignature(
        "EVM",
        "not-an-address",
        message,
        signature,
      ),
    ).toBe(false)
    const wallet = Wallet.createRandom()
    expect(
      await verifyOwnershipSignature(
        "EVM",
        address,
        message,
        await wallet.signMessage(message),
      ),
    ).toBe(false)
  })

  it.each([
    "ed25519",
    "ecdsa-secp256k1",
  ] as const)("verifies XRP %s public keys", async (algorithm) => {
    const { publicKey, privateKey } = deriveKeypair(generateSeed({ algorithm }))
    const address = deriveAddress(publicKey)
    const message = messageFor("XRP", address)
    const signature = sign(Buffer.from(message).toString("hex"), privateKey)
    expect(
      await verifyOwnershipSignature(
        "XRP",
        address,
        message,
        signature,
        publicKey,
      ),
    ).toBe(true)
  })

  it("rejects malformed Solana lengths and ignores a supplied substitute public key", async () => {
    const address = session.signer.SOLANA!.address
    const message = messageFor("SOLANA", address)
    const { signature } = await signOwnershipMessage("SOLANA", address, message)
    expect(
      await verifyOwnershipSignature(
        "SOLANA",
        "1".repeat(33),
        message,
        signature,
      ),
    ).toBe(false)
    expect(
      await verifyOwnershipSignature(
        "SOLANA",
        address,
        message,
        "1".repeat(63),
      ),
    ).toBe(false)
    expect(
      await verifyOwnershipSignature(
        "SOLANA",
        otherSession.signer.SOLANA!.address,
        message,
        signature,
        address,
      ),
    ).toBe(false)
  })

  it("fails closed for unknown families", async () => {
    const family = "UNKNOWN" as ChainFamily
    expect(
      await verifyOwnershipSignature(
        family,
        "address",
        messageFor("EVM", "address"),
        "signature",
      ),
    ).toBe(false)
    await expect(
      signOwnershipMessage(family, "address", messageFor("EVM", "address")),
    ).rejects.toThrow()
  })

  it("rejects unavailable signers and never falls back to transaction signing", async () => {
    const { sessionState } = await import(
      "@/login/context/SessionContext/storage"
    )
    const signPsbt = vi.fn()
    const signTransaction = vi.fn()
    try {
      sessionState.session = null
      await expect(
        signOwnershipMessage(
          "BTC",
          session.signer.BTC.address,
          messageFor("BTC", session.signer.BTC.address),
        ),
      ).rejects.toThrow("No ownership signer")
      sessionState.session = {
        ...session,
        signer: {
          ...session.signer,
          BTC: { ...session.signer.BTC, signAuthMessage: undefined, signPsbt },
          XRP: {
            ...session.signer.XRP!,
            signAuthMessage: undefined,
            sign: signTransaction,
          },
          SOLANA_DEVNET: undefined,
        },
      }
      for (const family of ["BTC", "XRP"] as const) {
        const address = session.signer[family]!.address
        await expect(
          signOwnershipMessage(family, address, messageFor(family, address)),
        ).rejects.toThrow("unsupported")
      }
      await expect(
        signOwnershipMessage(
          "SOLANA_DEVNET",
          session.signer.SOLANA!.address,
          messageFor("SOLANA_DEVNET", session.signer.SOLANA!.address),
        ),
      ).rejects.toThrow("No ownership signer")
      expect(signPsbt).not.toHaveBeenCalled()
      expect(signTransaction).not.toHaveBeenCalled()
    } finally {
      sessionState.session = session
    }
  })
})
