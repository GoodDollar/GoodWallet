import "server-only"

import ContractsAddress from "@gooddollar/goodprotocol/releases/deployment.json"
import { type Address, formatUnits, getAddress, parseAbi } from "viem"

import { CELO_CHAIN_ID, XDC_CHAIN_ID } from "@/chain/chain-ids"
import { getViemClient } from "@/chain/provider/EVM/viemClients"

const EXCHANGE_PROVIDER_ABI = parseAbi([
  "function getExchanges() view returns ((bytes32 exchangeId, address[] assets)[] exchanges)",
  "function currentPrice(bytes32 exchangeId) view returns (uint256 price)",
])

const ERC20_ABI = parseAbi(["function decimals() view returns (uint8)"])

const getDeploymentNetwork = (chainId: number) => {
  const contracts = process.env.NEXT_PUBLIC_GOODDOLLAR_CONTRACTS
  if (!contracts) {
    throw new Error("GoodDollar contracts environment is not configured")
  }

  return `${contracts}-${chainId === CELO_CHAIN_ID ? "celo" : "xdc"}`
}

export const isConfiguredGoodDollarToken = (
  chainId: number,
  tokenAddress: string,
) => {
  try {
    const network = getDeploymentNetwork(chainId)
    const goodDollarAddress = (
      ContractsAddress as Record<string, Record<string, unknown>>
    )[network]?.GoodDollar

    return (
      typeof goodDollarAddress === "string" &&
      goodDollarAddress.toLowerCase() === tokenAddress.toLowerCase()
    )
  } catch {
    return false
  }
}

export const isReservePriceEnabled = () =>
  process.env.NEXT_PUBLIC_USE_RESERVE_PRICE === "true"

/**
 * Reads the continuous Bancor price configured in the Mento exchange
 * provider. The reserve asset is a USD-denominated stable asset on Celo/XDC.
 */
export const getReserveGoodDollarPrice = async (
  chainId: number,
  goodDollarAddress: string,
): Promise<string> => {
  if (chainId !== CELO_CHAIN_ID && chainId !== XDC_CHAIN_ID) {
    throw new Error(`Reserve G$ pricing is unsupported on chain ${chainId}`)
  }

  const network = getDeploymentNetwork(chainId)
  const exchangeProvider = (
    ContractsAddress as Record<string, Record<string, unknown>>
  )[network]?.MentoExchangeProvider as Address | undefined
  if (!exchangeProvider) {
    throw new Error(`Mento exchange provider is not configured for ${network}`)
  }

  const client = getViemClient(chainId)
  const goodDollar = getAddress(goodDollarAddress)
  const exchanges = await client.readContract({
    address: exchangeProvider,
    abi: EXCHANGE_PROVIDER_ABI,
    functionName: "getExchanges",
  })
  const exchange = exchanges.find(({ assets }) =>
    assets.some((asset) => asset.toLowerCase() === goodDollar.toLowerCase()),
  )

  if (!exchange) {
    throw new Error(`No Mento G$ exchange found for ${network}`)
  }

  const reserveAsset = exchange.assets.find(
    (asset) => asset.toLowerCase() !== goodDollar.toLowerCase(),
  )
  if (!reserveAsset) {
    throw new Error(`No Mento reserve asset found for ${network}`)
  }

  const [price, reserveAssetDecimals] = await Promise.all([
    client.readContract({
      address: exchangeProvider,
      abi: EXCHANGE_PROVIDER_ABI,
      functionName: "currentPrice",
      args: [exchange.exchangeId],
    }),
    client.readContract({
      address: reserveAsset,
      abi: ERC20_ABI,
      functionName: "decimals",
    }),
  ])

  return formatUnits(price, reserveAssetDecimals)
}
