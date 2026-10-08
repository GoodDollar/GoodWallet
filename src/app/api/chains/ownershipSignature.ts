import { createHash, createPublicKey, verify } from "node:crypto"

import type { ChainFamily } from "@/chain/types"

/**
 * Verify ownership of the requested address, not merely validity under a supplied key.
 * The caller must reconstruct a trusted challenge message containing family, address,
 * timestamp and expiry, and enforce freshness. This function checks cryptography
 * only; SOLANA/XRP network variants share address formats and signing algorithms.
 * Wire signatures: EVM ethers hex, Solana base58, BTC/DOGE compact hex, XRP hex.
 */
export async function verifyOwnershipSignature(
  family: ChainFamily,
  address: string,
  message: string,
  signature: string,
  publicKey?: string,
): Promise<boolean> {
  try {
    if (!message.startsWith("GoodWallet wallet login v2\n")) return false

    switch (family) {
      case "EVM": {
        const { getAddress, verifyMessage } = await import("ethers")
        return getAddress(address) === verifyMessage(message, signature)
      }
      case "SOLANA":
      case "SOLANA_DEVNET": {
        const { getBase58Encoder } = await import("gill")
        // Bound decoding before handling untrusted base58 strings.
        if (address.length > 44 || signature.length > 88) return false
        const encoder = getBase58Encoder()
        const key = encoder.encode(address)
        const sig = encoder.encode(signature)
        if (key.length !== 32 || sig.length !== 64) return false
        const publicKeyObject = createPublicKey({
          key: Buffer.concat([
            // SubjectPublicKeyInfo header for a raw 32-byte Ed25519 public key.
            Buffer.from("302a300506032b6570032100", "hex"),
            new Uint8Array(key),
          ]),
          format: "der",
          type: "spki",
        })
        return verify(
          null,
          Buffer.from(message, "utf8"),
          publicKeyObject,
          new Uint8Array(sig),
        )
      }
      case "BTC":
      case "BTC_TESTNET":
      case "DOGE":
      case "DOGE_TESTNET": {
        if (
          !publicKey ||
          !/^(02|03)[0-9a-f]{64}$/i.test(publicKey) ||
          !/^[0-9a-f]{128}$/i.test(signature)
        ) {
          return false
        }

        const { networks, payments } = await import("bitcoinjs-lib")
        const { verify: verifyEcdsa } = await import("@bitcoinerlab/secp256k1")
        const { dogeNetwork, dogeTestNetwork } = await import(
          "@/login/adapters/bitcoinNetworks"
        )
        const pubkey = Buffer.from(publicKey, "hex")
        const network = {
          BTC: networks.bitcoin,
          BTC_TESTNET: networks.testnet,
          DOGE: dogeNetwork,
          DOGE_TESTNET: dogeTestNetwork,
        }[family]
        const payment =
          family === "BTC" || family === "BTC_TESTNET"
            ? payments.p2wpkh({ pubkey, network })
            : payments.p2pkh({ pubkey, network })
        if (payment.address !== address) return false

        // Internal authentication protocol, explicitly NOT BIP322 or tx signing.
        const digest = createHash("sha256").update(message, "utf8").digest()
        return verifyEcdsa(digest, pubkey, Buffer.from(signature, "hex"))
      }
      case "XRP":
      case "XRP_TESTNET": {
        if (
          !publicKey ||
          !/^(02|03|ed)[0-9a-f]{64}$/i.test(publicKey) ||
          !/^(?:[0-9a-f]{2}){64,72}$/i.test(signature)
        ) {
          return false
        }
        const { deriveAddress, verify: verifyXrp } = await import(
          "ripple-keypairs"
        )
        return (
          deriveAddress(publicKey) === address &&
          verifyXrp(
            Buffer.from(message, "utf8").toString("hex"),
            signature,
            publicKey,
          )
        )
      }
      default:
        return false
    }
  } catch {
    // Untrusted malformed keys, addresses and signatures fail closed.
    return false
  }
}
