// pUSD is the collateral every Polymarket order settles in. It is a USDC-backed
// ERC-20 wrapper; the exchange no longer accepts USDC.e directly.
// Mirrors the SDK's production `contracts.collateralToken`.
export const COLLATERAL_TOKEN_ADDRESS =
  "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB" as const

export const COLLATERAL_DECIMALS = 6
