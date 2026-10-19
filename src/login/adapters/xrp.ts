import { derivePath } from "ed25519-hd-key"

import { DerivationPaths } from "@/utils/derivationPaths"

export const getXrpSecretSeed = async (
  chainType: "XRP" | "XRP_TESTNET",
  masterSeed: string,
): Promise<string> => {
  const { ECDSA, encodeSeed } = await import("xrpl")
  const bytesToKeepForED25519 = 16
  const derivedSeed = derivePath(DerivationPaths[chainType], masterSeed).key
  return encodeSeed(
    Buffer.from(derivedSeed).subarray(0, bytesToKeepForED25519),
    ECDSA.ed25519,
  )
}
