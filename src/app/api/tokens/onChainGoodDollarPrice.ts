import "server-only"

import { formatUnits, parseAbi } from "viem"

import { CELO_CHAIN_ID } from "@/chain/chain-ids"
import { getViemClient } from "@/chain/provider/EVM/viemClients"
import { getG$Decimals } from "@/gooddollar/config"

// G$/cUSD Uniswap V3 pool (Celo)
const POOL_ADDRESS = "0x9491d57c5687AB75726423B55AC2d87D1cDa2c3F"
const POOL_ABI = parseAbi([
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
])

// Create a Viem public client for Celo
const celoClient = getViemClient(CELO_CHAIN_ID)

/**
 * Fetches G$ price from Uniswap V3 pool on Celo
 * @returns Formatted price or undefined if fetch fails
 */
export const getGoodDollarPrice = async (): Promise<string | undefined> => {
  // Read pool data
  const slot0 = await celoClient.readContract({
    address: POOL_ADDRESS,
    abi: POOL_ABI,
    functionName: "slot0",
  })
  const displayDecimals = getG$Decimals(CELO_CHAIN_ID)

  // Convert to BigInt for precise calculation
  const sqrtPrice = slot0[0]
  const sqrtPriceSquared = sqrtPrice * sqrtPrice

  // Create 10^displayDecimals for precision
  const scalingFactor = BigInt(10 ** displayDecimals)

  // Calculate price: (sqrtPrice)² × 10^decimals ÷ 2^192
  const price = (sqrtPriceSquared * scalingFactor) >> BigInt(192)
  return formatUnits(price, displayDecimals)
}
