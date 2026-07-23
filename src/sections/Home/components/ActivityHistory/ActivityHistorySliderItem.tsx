import type React from "react"
import useSWRImmutable from "swr/immutable"
import { Button } from "ui"

import { formatUnits } from "ethers-utils"
import { AVAILABLE_CHAINS, toExplorerUrl } from "@/chain/chains"
import { getChainProvider } from "@/chain/provider/provider"
import { TokenLogo } from "@/components/TokenLogo/TokenLogo"
import { truncateString } from "@/components/Utils/format"
import {
  formatTokenAmount,
  formatTokenValue,
} from "@/components/Utils/tokenFormat"
import { config } from "@/config"
import { useSelectedCurrency } from "@/stores/currencyStore"

import type { ActivityHistoryItem } from "./ActivityHistoryItem"
import styles from "./ActivityHistorySliderItem.module.css"

export async function getTransactionGasPrice([txHash, chainId]: [
  string,
  number,
]): Promise<number | null> {
  const url = config.rpcUrls[chainId]
  if (!url) return null
  if (!url.includes("alchemy")) return null
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionByHash",
      params: [txHash],
    }),
  })
  const json = await res.json()
  // Return the numeric value of gasPrice if present.
  return json.result && json.result.gasPrice
    ? parseInt(json.result.gasPrice, 16)
    : null
}

export const SliderItem: React.FC<ActivityHistoryItem> = (sliderItem) => {
  const { data: ens } = useSWRImmutable(
    sliderItem.to && [sliderItem.to, "sliderItemEns"],
    ([addressLike]: string) =>
      getChainProvider(sliderItem.chainId).getNameForAddress(addressLike),
  )

  const selectedCurrency = useSelectedCurrency()

  // Fetch gas price using the transaction hash and chainId only if sliderItem.gas is not provided.
  const { data: fetchedGas } = useSWRImmutable(
    sliderItem.gas ? null : [sliderItem.txHash, sliderItem.chainId],
    getTransactionGasPrice,
  )

  // If sliderItem.gas exists, use it; otherwise convert fetchedGas using the native token decimals.
  const displayedGasFee =
    sliderItem.gas ??
    (fetchedGas && formatUnits(fetchedGas, sliderItem.nativeToken?.decimals))

  const chain = AVAILABLE_CHAINS.get(sliderItem.chainId)

  return (
    <>
      <SliderRow label="Type">{truncateString(sliderItem.label, 20)}</SliderRow>
      <SliderRow label="Date">
        <TwoElementStacked
          el1={sliderItem.timeStamp.toLocaleDateString()}
          el2={sliderItem.timeStamp.toLocaleTimeString()}
        />
      </SliderRow>
      <SliderRow label="Amount">
        <div className="flex gap-x-2 font-semibold" translate="no">
          <TwoElementStacked
            el1={formatTokenAmount(sliderItem.amount, sliderItem.symbol)}
            el2={formatTokenValue(
              Number(sliderItem.amount) * Number(sliderItem.priceToken),
              selectedCurrency,
            )}
          />
          <div>
            <TokenLogo
              address={sliderItem.tokenAddress}
              chainId={sliderItem.chainId}
              alt={sliderItem.name}
            />
          </div>
        </div>
      </SliderRow>
      <SliderRow label="From">
        <div translate="no">{truncateString(sliderItem.from, 12, 4)} </div>
        <div>
          <Button variant="square" icon="BsCopy" copyValue={sliderItem.from} />
        </div>
      </SliderRow>
      <SliderRow label="To">
        <div translate="no">
          {ens ? ens : truncateString(sliderItem.to, 12, 4)}
        </div>
        <div>
          <Button
            variant="square"
            icon="BsCopy"
            copyValue={ens ?? sliderItem.to}
          />
        </div>
      </SliderRow>
      {displayedGasFee ? (
        <SliderRow label="Gas fee">
          <div className="font-semibold" translate="no">
            <TwoElementStacked
              el1={formatTokenAmount(
                displayedGasFee,
                sliderItem.nativeToken?.symbol ?? "",
              )}
              el2={formatTokenValue(
                Number(displayedGasFee) * Number(sliderItem.priceNative),
                selectedCurrency,
              )}
            />
          </div>
        </SliderRow>
      ) : null}
      <SliderRow label="TxHash">
        <a
          className="break-all w-44 text-xs"
          href={toExplorerUrl(sliderItem.txHash, chain?.id)}
          target="_blank"
          rel="noopener noreferrer"
          translate="no"
        >
          {truncateString(sliderItem.txHash, 20, 20)}
        </a>
        <div>
          <Button
            variant="square"
            icon="BsCopy"
            copyValue={sliderItem.txHash}
          />
        </div>
      </SliderRow>
    </>
  )
}

export const SliderRow = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => {
  return (
    <div className={styles.sliderRow}>
      <div className="text-gray-5">{label}</div>
      <div className="flex flex-wrap gap-x-2 items-center text-right">
        {children}
      </div>
    </div>
  )
}

export const TwoElementStacked = ({
  el1,
  el2,
}: {
  el1: React.ReactNode
  el2: React.ReactNode
}) => {
  return (
    <div className="flex flex-col">
      <div>{el1}</div>
      <div className="text-gray-5 text-right text-xs">{el2}</div>
    </div>
  )
}
