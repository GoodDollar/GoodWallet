import { useEffect, useMemo } from "react"
import Jazzicon, { jsNumberForAddress } from "react-jazzicon"
import useSWRImmutable from "swr/immutable"
import { Box, Text } from "ui"
import { useSnapshot } from "valtio"

import { AVAILABLE_CHAINS } from "@/chain/chains"
import { getChainProvider } from "@/chain/provider/provider"
import { truncateString } from "@/components/Utils/format"
import type { Tx } from "@/hooks/useLedger/types"
import { useSessionContext } from "@/login"
import { activityHistoryStore } from "@/stores/transactionHistoryStore"
import { useTranslation } from "@/translations"

import { useSelectedTokens } from "../hooks/transaction"

export const SendRecent = (props: {
  onSelectAddress: (address: string) => void
}) => {
  const { addresses } = useSessionContext()
  const sendTranslations = useTranslation().translations.send

  const { selectedToken } = useSelectedTokens()
  const { isLoading, refreshHistory } = useSnapshot(activityHistoryStore)
  const perChain = useSnapshot(activityHistoryStore).perChain

  useEffect(() => {
    if (addresses) refreshHistory(addresses)
  }, [addresses, refreshHistory])

  const uniqByTo = (transactions: Tx[], limit: number) => {
    const res: Tx[] = []

    for (const transaction of transactions) {
      if (!res.find((t) => t.to === transaction.to)) {
        res.push(transaction)
      }

      if (res.length === limit) {
        return res
      }
    }

    return res
  }

  const recentTransfers = useMemo(() => {
    if (!selectedToken) return []
    const chain = AVAILABLE_CHAINS.get(selectedToken?.chainId)
    const address = chain && addresses?.get(chain.family)
    if (!address) return []
    const combined = Array.from(perChain.values()).flat()
    const transfers = combined
      .filter((e) =>
        chain.family === "EVM"
          ? e.method && ["Transferred", "Sent"].includes(e.method)
          : true,
      )
      .filter((e) => e.from.toLowerCase() === address.toLowerCase())
    return uniqByTo(transfers, 5)
  }, [perChain, selectedToken, addresses])

  const { data: historyItems, isLoading: isLoadingHistoryItems } =
    useSWRImmutable(!isLoading && recentTransfers, (transfers) => {
      return Promise.all(
        transfers.map(async (item) => ({
          address: item.to,
          ens: await getChainProvider(item.chainId).getNameForAddress(item.to),
        })),
      )
    })

  if (isLoading || recentTransfers.length === 0 || isLoadingHistoryItems)
    return null

  return (
    <Box vertical elevation="high" align="start" tabIndex={0}>
      <Text style="16-600">{sendTranslations.recent}</Text>

      <Box vertical scroll>
        {historyItems?.map((tx, index) => (
          <Box
            key={tx.address}
            tabIndex={index}
            onClick={() => props.onSelectAddress(tx.ens ? tx.ens : tx.address)}
          >
            <Jazzicon diameter={32} seed={jsNumberForAddress(tx.address)} />
            <Box vertical align="start" gap="small">
              <Text style="12-400">
                {tx.ens ? tx.ens : truncateString(tx.address, 14, 14)}
              </Text>
              {tx.ens ? (
                <Text style="12-400" color="text-secondary">
                  {truncateString(tx.address, 14, 14)}
                </Text>
              ) : null}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
