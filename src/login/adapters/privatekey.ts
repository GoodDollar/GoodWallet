import * as ecc from "@bitcoinerlab/secp256k1"
import { networks, type Psbt, payments } from "bitcoinjs-lib"
import ECPairFactory, { type ECPairInterface } from "ecpair"
import { derivePath, getPublicKey } from "ed25519-hd-key"
import { Wallet } from "ethers/wallet"
import { createKeyPairSignerFromBytes } from "gill"
import HDKey from "hdkey"
import { toHex } from "uint8array-tools"
import type { Transaction } from "xrpl"

import { config } from "@/config"
import { DerivationPaths } from "@/utils/derivationPaths"

import type { ISigner, ISignerSession } from "../types"
import { dogeNetwork, dogeTestNetwork } from "./bitcoinNetworks"

const ED25519_ALGORITHM_IDENTIFIER = Object.freeze({ name: "Ed25519" })

const ECPair = ECPairFactory(ecc)
export const validator = (
  pubkey: Uint8Array,
  msghash: Uint8Array,
  signature: Uint8Array,
): boolean => ECPair.fromPublicKey(pubkey).verify(msghash, signature)

export const getPrivateKeyHex = (
  chainType: keyof ISigner,
  masterSeed: string,
): string => {
  return getPrivateKey(chainType, masterSeed).toString("hex")
}

const getPrivateKey = (
  chainType: keyof ISigner,
  masterSeed: string,
): Buffer<ArrayBufferLike> => {
  switch (chainType) {
    case "XRP":
    case "XRP_TESTNET":
    case "SOLANA":
    case "SOLANA_DEVNET":
      return Buffer.from(derivePath(DerivationPaths[chainType], masterSeed).key)
    default: {
      const root = HDKey.fromMasterSeed(Buffer.from(masterSeed))
      const childkey = root.derive(DerivationPaths[chainType])
      const { privateKey } = childkey
      if (!privateKey) {
        throw new Error(`Private key for ${chainType} could not be derived`)
      }
      return privateKey
    }
  }
}

const getBitcoinAddress = async (
  keyPair: ECPairInterface,
  network: networks.Network,
  type: "p2wpkh" | "p2pkh",
) => {
  //P2WPKH -> "Native Segwit"
  //P2PKH -> "Legacy"
  const { address } = payments[type]({
    pubkey: keyPair.publicKey,
    network,
  })
  if (!address) {
    throw new Error("Bitcoin address not found")
  }
  return address
}

const bitcoinSigner = async (keyPair: ECPairInterface, psbt: Psbt) => {
  await psbt.signAllInputsAsync(keyPair)
  const isValid = psbt.validateSignaturesOfAllInputs(validator)
  if (!isValid) {
    throw new Error("Signature validation failed")
  }
  psbt.finalizeAllInputs()
  return psbt.extractTransaction(true).toHex()
}

const hasEd25519Support = (async () => {
  try {
    await crypto.subtle.importKey(
      "raw",
      new Uint8Array(Array(32).fill(0)),
      ED25519_ALGORITHM_IDENTIFIER,
      false,
      [],
    )
    return true
  } catch (error) {
    if (error instanceof Error && error.name === "NotSupportedError") {
      return false
    }
    throw error
  }
})()

const createKeyPairSignerWithFallback = async (privateKey: Buffer) => {
  const secretKey = new Uint8Array(64)
  const publicKey = getPublicKey(privateKey, false)
  secretKey.set(privateKey)
  secretKey.set(publicKey, 32)

  const shouldPolyfill = !(await hasEd25519Support)
  if (shouldPolyfill) {
    console.log("Polyfilling ed25519 support for Solana")
    const { install } = await import("@solana/webcrypto-ed25519-polyfill")
    install()
  }
  return await createKeyPairSignerFromBytes(secretKey)
}

export const getPrivateKeySession = async (
  masterSeed: string,
  sessionOrigin: string,
  authProvider: string,
  userName?: string,
  profileImage?: string,
): Promise<ISignerSession> => {
  const evmPrivateKey = getPrivateKey("EVM", masterSeed)
  const evmWallet = new Wallet(evmPrivateKey.toString("hex"))
  const btcPrivKey = getPrivateKey("BTC", masterSeed)
  const btcKeyPair = ECPair.fromPrivateKey(btcPrivKey, {
    network: networks.bitcoin,
  })

  const dogePrivKey = getPrivateKey("DOGE", masterSeed)
  const dogeKeyPair = ECPair.fromPrivateKey(dogePrivKey, {
    network: dogeNetwork,
  })

  //Use ED25519 HD Key to derive Solana private key
  const solanaPrivKey = getPrivateKey("SOLANA", masterSeed)
  const solanaKeyPairSigner =
    await createKeyPairSignerWithFallback(solanaPrivKey)

  const signer: ISigner = {
    EVM: evmWallet,
    BTC: {
      address: await getBitcoinAddress(btcKeyPair, networks.bitcoin, "p2wpkh"),
      signPsbt: async (psbt: Psbt) => bitcoinSigner(btcKeyPair, psbt),
      publicKey: toHex(btcKeyPair.publicKey),
    },
    DOGE: {
      address: await getBitcoinAddress(dogeKeyPair, dogeNetwork, "p2pkh"),
      signPsbt: async (psbt: Psbt) => bitcoinSigner(dogeKeyPair, psbt),
      publicKey: toHex(dogeKeyPair.publicKey),
    },
    SOLANA: solanaKeyPairSigner,
    XRP: await getXrpPair("XRP", masterSeed),
  }

  if (config.includeTestnetTokens) {
    // BTC
    const btcTestnetPrivKey = getPrivateKey("BTC_TESTNET", masterSeed)
    const btcTestnetKeyPair = ECPair.fromPrivateKey(btcTestnetPrivKey, {
      network: networks.testnet,
    })

    signer.BTC_TESTNET = {
      address: await getBitcoinAddress(
        btcTestnetKeyPair,
        networks.testnet,
        "p2wpkh",
      ),
      signPsbt: async (psbt: Psbt) => bitcoinSigner(btcTestnetKeyPair, psbt),
      publicKey: toHex(btcTestnetKeyPair.publicKey),
    }

    // DOGE
    const dogeTestPrivKey = getPrivateKey("DOGE_TESTNET", masterSeed)
    const dogeTestKeyPair = ECPair.fromPrivateKey(dogeTestPrivKey, {
      network: dogeTestNetwork,
    })

    signer.DOGE_TESTNET = {
      publicKey: toHex(dogeTestKeyPair.publicKey),
      address: await getBitcoinAddress(
        dogeTestKeyPair,
        dogeTestNetwork,
        "p2pkh",
      ),
      signPsbt: async (psbt: Psbt) => bitcoinSigner(dogeTestKeyPair, psbt),
    }

    // SOL
    const solanaTestPrivKey = getPrivateKey("SOLANA_DEVNET", masterSeed)
    const solanaTestKeyPairSigner =
      await createKeyPairSignerWithFallback(solanaTestPrivKey)
    signer.SOLANA_DEVNET = solanaTestKeyPairSigner

    // XRP
    signer.XRP_TESTNET = await getXrpPair("XRP_TESTNET", masterSeed)
  }

  return {
    type: "PRIVATE_KEY",
    sessionOrigin,
    authProvider,
    userName,
    profileImage,
    signer,
    masterSeed,
  }
}

/**
 * Resource: https://xrpl.org/docs/concepts/accounts/cryptographic-keys#key-derivation
 *
 * The private key gets computed inside the deriveKeyPair in the ripple-keypairs module using Sha512.half, as can be seen also from
 * the link above.
 */
const getXrpPair = async (
  chainType: "XRP" | "XRP_TESTNET",
  masterSeed: string,
) => {
  const { ECDSA, encodeSeed, deriveAddress, deriveKeypair, encode } =
    await import("xrpl")
  const { hashSignedTx } = await import("xrpl/dist/npm/utils/hashes")
  const { encodeForSigning } = await import("ripple-binary-codec")
  const { sign } = await import("ripple-keypairs")

  const bytesToKeepForED25519 = 16
  const derivedSeed = getPrivateKey(chainType, masterSeed)
  const encodedSeed = encodeSeed(
    derivedSeed.subarray(0, bytesToKeepForED25519),
    ECDSA.ed25519,
  )
  const { publicKey, privateKey } = deriveKeypair(encodedSeed, {
    algorithm: ECDSA.ed25519,
  })

  return {
    address: deriveAddress(publicKey),
    publicKey,
    sign: async (tx: Transaction) => {
      const txToSignAndEncode = { ...tx }
      txToSignAndEncode.SigningPubKey = publicKey
      txToSignAndEncode.TxnSignature = sign(
        encodeForSigning(txToSignAndEncode),
        privateKey,
      )
      const serialized = encode(txToSignAndEncode)
      return {
        tx_blob: serialized,
        hash: hashSignedTx(serialized),
      }
    },
  }
}
