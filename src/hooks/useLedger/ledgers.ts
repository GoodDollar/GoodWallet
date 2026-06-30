import { getChainProvider } from "@/chain/provider/provider"
import type { Addresses } from "@/login/types"

export const getMultiChainLedger = async ([addresses, chainIds]: [
  Addresses,
  number[],
]) => {
  const transactions = await Promise.all(
    chainIds.map(async (chainId) => {
      try {
        const chainProvider = getChainProvider(chainId)
        const address = addresses.get(chainProvider.family)
        if (!address) {
          return []
        }
        return await chainProvider.getTransactions(chainId, address)
      } catch (error) {
        console.error(`Error getting transactions on ${chainId}: ${error}`)
        return []
      }
    }),
  )
  return transactions.flat().sort((a, b) => b.timestamp - a.timestamp)
}
