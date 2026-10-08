import type { ChainFamily } from "@/chain/types"

/** Sign a server-issued ownership challenge with the exact family/address signer. */
export async function signOwnershipMessage(
  family: ChainFamily,
  address: string,
  message: string,
): Promise<{ signature: string; publicKey?: string }> {
  if (!message.startsWith("GoodWallet wallet login v2\n")) {
    throw new Error("Invalid ownership message domain")
  }

  // Storage reconstructs private-key signers on initialization. Import only when
  // needed to avoid a storage -> provider -> auth -> storage initialization cycle.
  const { sessionState } = await import(
    "@/login/context/SessionContext/storage"
  )
  const signers = sessionState.session?.signer
  const signer = signers?.[family]
  if (!signers || !signer) {
    throw new Error(`No ownership signer for ${family}`)
  }

  const { getAddress } = await import("ethers/address")
  const matches =
    family === "EVM"
      ? getAddress(signer.address) === getAddress(address)
      : signer.address === address
  if (!matches) throw new Error("Ownership signer address mismatch")

  switch (family) {
    case "EVM":
      return { signature: await signers.EVM.signMessage(message) }
    case "SOLANA":
    case "SOLANA_DEVNET": {
      const {
        address: solanaAddress,
        createSignableMessage,
        getBase58Decoder,
      } = await import("gill")
      const signingAddress = solanaAddress(address)
      const solanaSigner = signers[family]
      if (!solanaSigner) throw new Error(`No ownership signer for ${family}`)
      const results = await solanaSigner.signMessages([
        createSignableMessage(message),
      ])
      const signature = results[0]?.[signingAddress]
      if (!signature || signature.length !== 64) {
        throw new Error("Missing ownership signature")
      }
      return { signature: getBase58Decoder().decode(signature) }
    }
    case "BTC":
    case "BTC_TESTNET":
    case "DOGE":
    case "DOGE_TESTNET":
    case "XRP":
    case "XRP_TESTNET": {
      const authSigner = signers[family]
      if (!authSigner?.signAuthMessage) {
        throw new Error(`Ownership message signing unsupported for ${family}`)
      }
      return {
        signature: await authSigner.signAuthMessage(message),
        publicKey: authSigner.publicKey,
      }
    }
    default:
      throw new Error("Unsupported ownership family")
  }
}
