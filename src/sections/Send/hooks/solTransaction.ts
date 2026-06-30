import useSWRImmutable from "swr/immutable"

import { getChainProvider } from "@/chain/provider/provider"

import { useSelectedTokens } from "./transaction"

export const useSolPrioritizationFeeMicroLamports = () => {
  const { selectedToken } = useSelectedTokens()
  const { data: prioritizationFee } = useSWRImmutable(
    selectedToken
      ? [selectedToken.chainId, "estimateSolPrioritizationFee"]
      : null,
    ([chainId]) => {
      const chainUtils = getChainProvider(chainId)
      switch (chainUtils.family) {
        case "SOLANA":
        case "SOLANA_DEVNET":
          return chainUtils.getPrioritizationFee()
        default:
          console.error("Unsupported chain family")
          return Promise.resolve(BigInt(0))
      }
    },
    {
      refreshInterval: 30000,
    },
  )
  return prioritizationFee
}
