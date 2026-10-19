import { describe, expect, it } from "vitest"

import { XDC_CHAIN_ID } from "@/chain/chain-ids"

import { normalizeEvmAddress } from "./address"

const XDC_ADDRESS = "xdcEC2136843a983885AebF2feB3931F73A8eBEe50c"
const EVM_ADDRESS = "0xEC2136843a983885AebF2feB3931F73A8eBEe50c"

describe("XDC EVM addresses", () => {
  it("normalizes XDC-prefixed addresses", () => {
    expect(normalizeEvmAddress(XDC_ADDRESS, XDC_CHAIN_ID)).toBe(EVM_ADDRESS)
  })

  it("does not normalize XDC-prefixed addresses on other chains", () => {
    expect(normalizeEvmAddress(XDC_ADDRESS, 1)).toBe(XDC_ADDRESS)
  })
})
