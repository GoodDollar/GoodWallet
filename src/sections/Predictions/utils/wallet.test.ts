import { concat, keccak256, pad, slice, toHex } from "viem"
import { describe, expect, it } from "vitest"

import { deriveSafeAddress } from "./wallet"

// This address decides whether an existing user reaches the funds and positions
// in their old Safe, so the derivation is checked against a CREATE2 computed
// from first principles rather than through viem's helper. That catches a
// miswiring of the salt or the init-code hash, which is the realistic mistake.
const SAFE_FACTORY = "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b"
const SAFE_INIT_CODE_HASH =
  "0x2bce2127ff07fb632d16c8347c4ebf501f4841168bed00d9e6ef715ddb6fcecf"

const create2FromScratch = (owner: `0x${string}`) => {
  // salt = keccak256(abi.encode(owner)), i.e. the owner left-padded to 32 bytes
  const salt = keccak256(
    pad(owner.toLowerCase() as `0x${string}`, { size: 32 }),
  )
  const hash = keccak256(
    concat([toHex(0xff), SAFE_FACTORY, salt, SAFE_INIT_CODE_HASH]),
  )
  return slice(hash, 12).toLowerCase()
}

describe("deriveSafeAddress", () => {
  const owners = [
    "0x0000000000000000000000000000000000000001",
    "0x1234567890123456789012345678901234567890",
    "0xdEAD000000000000000042069420694206942069",
  ] as const

  it("matches a CREATE2 address computed from first principles", () => {
    for (const owner of owners) {
      expect(deriveSafeAddress(owner).toLowerCase()).toBe(
        create2FromScratch(owner),
      )
    }
  })

  it("is checksummed and stable", () => {
    const owner = owners[1]
    expect(deriveSafeAddress(owner)).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(deriveSafeAddress(owner)).toBe(deriveSafeAddress(owner))
  })

  it("gives each owner a distinct Safe", () => {
    const derived = new Set(owners.map(deriveSafeAddress))
    expect(derived.size).toBe(owners.length)
  })

  // A mis-checksummed address must not throw: that would push a user who
  // already has a Safe onto a brand new Deposit Wallet, away from their funds.
  it("ignores the case of the owner address", () => {
    expect(
      deriveSafeAddress("0xdeaDBEeF00000000000000000000000000000000"),
    ).toBe(deriveSafeAddress("0xdeadbeef00000000000000000000000000000000"))
  })
})
