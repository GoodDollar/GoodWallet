import { describe, expect, it } from "vitest"
import { deriveAddress, deriveKeypair, ECDSA } from "xrpl"

import { getXrpSecretSeed } from "./xrp"

const MASTER_SEED =
  "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f"
const XRP_ADDRESS = "rBeRHTffsNHHAS4M5fAKs97qiBGxPNDNBv"

describe("getXrpSecretSeed", () => {
  it("exports an Ed25519 seed that reproduces the displayed XRP address", async () => {
    const secretSeed = await getXrpSecretSeed("XRP", MASTER_SEED)
    const { publicKey } = deriveKeypair(secretSeed, {
      algorithm: ECDSA.ed25519,
    })

    expect(secretSeed).toBe("sEdVXiyHrNDHk9wYx7DyozMwGzJwGLT")
    expect(deriveAddress(publicKey)).toBe(XRP_ADDRESS)
  })
})
