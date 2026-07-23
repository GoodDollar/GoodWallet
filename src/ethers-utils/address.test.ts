import { describe, expect, it } from "vitest"

import { XDC_CHAIN_ID } from "@/chain/chain-ids"

import { isValidEvmAddress, normalizeEvmAddress } from "./address"

const XDC_ADDRESS = "xdcEC2136843a983885AebF2feB3931F73A8eBEe50c"
const EVM_ADDRESS = "0xEC2136843a983885AebF2feB3931F73A8eBEe50c"

describe("XDC EVM addresses", () => {
  it("normalizes XDC-prefixed addresses", () => {
    expect(normalizeEvmAddress(XDC_ADDRESS, XDC_CHAIN_ID)).toBe(EVM_ADDRESS)
  })

  it("accepts valid XDC-prefixed addresses only on the XDC chain", () => {
    expect(isValidEvmAddress(XDC_ADDRESS, XDC_CHAIN_ID)).toBe(true)
    expect(isValidEvmAddress(XDC_ADDRESS, 1)).toBe(false)
  })

  it("rejects invalid XDC-prefixed addresses", () => {
    expect(isValidEvmAddress("xdcinvalid", XDC_CHAIN_ID)).toBe(false)
  })
})
