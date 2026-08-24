import useSWR from "swr"
import { erc20Abi, formatUnits } from "viem"

import { formatTokenValue } from "@/components/Utils/tokenFormat"

import { QUERY_REFETCH_INTERVALS } from "../constants/query"
import {
  COLLATERAL_DECIMALS,
  COLLATERAL_TOKEN_ADDRESS,
} from "../constants/tokens"
import { useWallet } from "../providers/WalletContext"

// pUSD balance of the account wallet - the collateral every order settles in.
export default function useCollateralBalance(address: string | undefined) {
  const { publicClient } = useWallet()

  const {
    data: rawBalance,
    isLoading,
    error,
    mutate,
  } = useSWR(
    [address, "collateralBalance"],
    async () => {
      if (!address || !publicClient) return null

      return publicClient.readContract({
        address: COLLATERAL_TOKEN_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      })
    },
    {
      refreshInterval: QUERY_REFETCH_INTERVALS.BALANCE,
      revalidateOnFocus: true,
    },
  )

  const balance = rawBalance
    ? Number(formatUnits(rawBalance, COLLATERAL_DECIMALS))
    : 0

  const formattedBalance = rawBalance
    ? formatTokenValue(balance, {
        currency: "USD",
        usdExchangeRate: 1,
        symbol: "$",
      })
    : 0

  return {
    formattedBalance,
    balance,
    rawBalance,
    isLoading,
    isError: !!error,
    mutate,
  }
}
