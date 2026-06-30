import useSWR from "swr"
import { erc20Abi, formatUnits } from "viem"

import { formatTokenValue } from "@/components/Utils/tokenFormat"

import { QUERY_REFETCH_INTERVALS } from "../constants/query"
import { USDC_E_CONTRACT_ADDRESS, USDC_E_DECIMALS } from "../constants/tokens"
import { useWallet } from "../providers/WalletContext"

export default function usePolygonBalances(address: string | undefined) {
  const { publicClient } = useWallet()

  const {
    data: usdcBalance,
    isLoading,
    error,
    mutate,
  } = useSWR(
    [address, "usdcBalance"],
    async () => {
      if (!address || !publicClient) return null

      const balance = await publicClient.readContract({
        address: USDC_E_CONTRACT_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      })

      return balance
    },
    {
      refreshInterval: QUERY_REFETCH_INTERVALS.BALANCE,
      revalidateOnFocus: true,
    },
  )

  const usdceBalance = usdcBalance
    ? Number(formatUnits(usdcBalance, USDC_E_DECIMALS))
    : 0

  const formattedUsdcBalance = usdcBalance
    ? formatTokenValue(usdceBalance, {
        currency: "USD",
        usdExchangeRate: 1,
        symbol: "$",
      })
    : 0

  return {
    formattedUsdcBalance,
    usdceBalance,
    rawUsdcBalance: usdcBalance,
    isLoading,
    isError: !!error,
    mutate,
  }
}
