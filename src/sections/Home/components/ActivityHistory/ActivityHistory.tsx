"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { Box, Button, Drawer, Slide3, Text } from "ui"
import { useSnapshot } from "valtio"

import { CELO_ADDRESS, ZERO_ADDRESS } from "ethers-utils"
import { useTranslation } from "translations"
import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"
import { CELO_CHAIN_ID } from "@/chain/chain-ids"
import { AVAILABLE_CHAINS_IDS, getChainName } from "@/chain/chains"
import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import { type Tx, TxDirection } from "@/hooks/useLedger/types"
import { useTokenBalances } from "@/hooks/useTokenBalances"
import { useSessionContext } from "@/login"
import { activityHistoryStore } from "@/stores/transactionHistoryStore"

import { ActivityHistoryItem } from "./ActivityHistoryItem"
import { SliderItem } from "./ActivityHistorySliderItem"
import { ChainSelectorSliderRow } from "./ChainSelectorSliderRow"

export const ActivityHistory = () => {
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null)
  const { translations } = useTranslation()
  const { captureEvent } = useAnalytics()

  const { addresses } = useSessionContext()
  const [isOpen, setIsOpen] = useState(false)
  const [isChainSelectorOpen, setIsChainSelectorOpen] = useState(false)
  const [item, setItem] = useState<ActivityHistoryItem>()
  const { isLoading, refreshHistory } = useSnapshot(activityHistoryStore)
  const perChain = useSnapshot(activityHistoryStore).perChain
  const { tokens, prices } = useTokenBalances()

  useEffect(() => {
    if (addresses) {
      refreshHistory(addresses)
    }
  }, [addresses, refreshHistory])

  const onExpandItem = useCallback(
    (item: ActivityHistoryItem) => () => {
      setItem(item)
      captureEvent({
        type: AnalyticsEventTypes.ActivityHistoryExpand,
        txHash: item.txHash,
      })
      setIsOpen(true)
    },
    [captureEvent],
  )

  const onSelectChain = useCallback(
    (chainId: number | null) => {
      setSelectedChainId(chainId)
      captureEvent({
        type: AnalyticsEventTypes.ActivityHistoryFilter,
        chainId: chainId ?? 0,
      })
      setIsChainSelectorOpen(false)
    },
    [captureEvent, setSelectedChainId],
  )

  const mapTxListToActivityHistoryItemList = useCallback(
    (txList: Tx[]): ActivityHistoryItem[] => {
      return txList
        .map((tx) => {
          if (
            tx.chainId === CELO_CHAIN_ID &&
            tx.tokenAddress.toLowerCase() === CELO_ADDRESS.toLowerCase()
          ) {
            return {
              ...tx,
              tokenAddress: ZERO_ADDRESS,
            }
          }
          return tx
        })
        .filter(
          (tx) =>
            tokens?.getBy({
              chainId: tx.chainId,
              address: tx.tokenAddress,
            }) !== undefined,
        )
        .map((tx) => {
          const token = tokens?.getBy({
            chainId: tx.chainId,
            address: tx.tokenAddress,
          })
          return {
            chainId: tx.chainId,
            symbol: token?.symbol ?? "",
            amount: tx.amount,
            tokenAddress: tx.tokenAddress,
            direction: tx.txDirection,
            timeStamp: new Date(tx.timestamp * 1000),
            label:
              tx.method ??
              (tx.txDirection === TxDirection.INCOMING ? "Received" : "Sent"),
            name: token?.name ?? "",
            from: tx.from,
            to: tx.to,
            gas: tx.gas,
            txHash: tx.hash,
            nativeToken: tokens?.getNativeBy({ chainId: tx.chainId }),
            priceNative: prices?.getNativeBy({ chainId: tx.chainId }),
            priceToken: prices?.getBy({
              chainId: tx.chainId,
              address: tx.tokenAddress,
            }),
            incoming: tx.txDirection === TxDirection.INCOMING,
            showChainName: selectedChainId === null,
          }
        })
    },
    [tokens, prices, selectedChainId],
  )

  const normalizedTransactions = useMemo(() => {
    return Array.from(perChain.values())
      .flatMap((transactionsPerChain) =>
        mapTxListToActivityHistoryItemList(transactionsPerChain),
      )
      .sort((a, b) => b.timeStamp.getTime() - a.timeStamp.getTime())
  }, [perChain, mapTxListToActivityHistoryItemList])

  const normalizedTransactionFilteredBySelectedChain = useMemo(() => {
    return normalizedTransactions
      .filter((e) => selectedChainId === null || selectedChainId === e.chainId)
      .splice(0, 50)
  }, [normalizedTransactions, selectedChainId])

  const activeChains = useMemo(() => {
    return [
      null,
      ...AVAILABLE_CHAINS_IDS.filter((chainId) =>
        normalizedTransactions.some((e) => e.chainId === chainId),
      ),
    ]
  }, [normalizedTransactions])

  const ActivityList = () => {
    return (
      <div>
        {normalizedTransactionFilteredBySelectedChain.map((item, index) => (
          <ActivityHistoryItem
            key={index}
            historyItem={item}
            onClick={onExpandItem(item)}
            renderingAllTokens={selectedChainId == null}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="flex py-2">
        <Button
          variant="pill"
          text={
            selectedChainId === null
              ? translations.home.allTokens
              : getChainName(selectedChainId)
          }
          icon={isChainSelectorOpen ? "ArrowUp" : "ArrowDown"}
          onClick={() => setIsChainSelectorOpen(true)}
        />
      </div>

      {isLoading &&
      normalizedTransactionFilteredBySelectedChain.length === 0 ? (
        <div style={{ marginTop: "20%" }}>
          <LoadingSpinner />
        </div>
      ) : normalizedTransactionFilteredBySelectedChain.length > 0 ? (
        <ActivityList />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 mt-[5%] filter grayscale">
          <Image src={Slide3} alt="" width={64} height={64} />
          <Text align="center" style="20-600" color="text-tertiary">
            {translations.home.noActivity.title}
          </Text>
          <Text align="center" style="14-400" color="text-tertiary">
            {translations.home.noActivity.description}
          </Text>
        </div>
      )}

      <Drawer
        open={isChainSelectorOpen}
        onClose={() => setIsChainSelectorOpen(false)}
      >
        <Box vertical gap="none">
          {activeChains.map((chainId) => (
            <ChainSelectorSliderRow
              key={chainId ?? 0}
              chainId={chainId}
              onClick={() => onSelectChain(chainId)}
              selected={chainId === selectedChainId}
            />
          ))}
        </Box>
      </Drawer>

      <Drawer open={isOpen} onClose={() => setIsOpen(false)}>
        {item && <SliderItem {...item} />}
      </Drawer>
    </div>
  )
}
