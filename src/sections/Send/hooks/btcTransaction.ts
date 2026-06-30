import useSWRImmutable from "swr/immutable"

import { getChainProvider } from "@/chain/provider/provider"

import { useSelectedTokens } from "./transaction"

export const useNetworkFeePerByteSats = () => {
  const { selectedToken } = useSelectedTokens()
  const { data: feePerByteSats } = useSWRImmutable(
    selectedToken
      ? [selectedToken.chainId, "estimateBtcNetworkFeePerByteSats"]
      : null,
    ([chainId]) => {
      const chainUtils = getChainProvider(chainId)
      switch (chainUtils.family) {
        case "BTC":
        case "BTC_TESTNET":
        case "DOGE":
        case "DOGE_TESTNET":
          return chainUtils.getNetworkFeeSatsPerByte()
        default:
          console.error("Unsupported chain family")
          return 0
      }
    },
    {
      refreshInterval: 30000,
    },
  )
  return feePerByteSats
}
