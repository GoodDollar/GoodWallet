import { type BigNumberish, FixedNumber } from "ethers/utils"

import { parseAmount } from "ethers-utils"

import type { BaseTokenIdentifier, TokenBalance } from "./types"

export function isEqual(
  tokenA: BaseTokenIdentifier,
  tokenB: BaseTokenIdentifier,
) {
  return (
    tokenA.chainId === tokenB.chainId &&
    tokenA.address.toLowerCase() === tokenB.address.toLowerCase()
  )
}

export const mulWithTokenBalanceUsdPrice = (
  amount: BigNumberish | FixedNumber,
  tokenBalance: TokenBalance,
): FixedNumber | undefined => {
  if (!tokenBalance.hasValue || amount.toString().trim().length === 0) {
    return
  }
  const parsedPriceUSD = parseAmount(tokenBalance.priceUSD)
  const parsedAmount =
    amount instanceof FixedNumber ? amount : parseAmount(amount)
  const result = parsedPriceUSD.mul(parsedAmount)

  return result
}
