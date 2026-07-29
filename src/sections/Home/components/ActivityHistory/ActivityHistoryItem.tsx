import type { JSX } from "react"

import { TokenLogo } from "@/components/TokenLogo/TokenLogo"
import { truncateString } from "@/components/Utils/format"
import { formatTokenAmount } from "@/components/Utils/tokenFormat"
import type { TokenInfo } from "@/tokens/types"

export type ActivityHistoryItem = {
  chainId: number
  symbol: string
  name: string
  tokenAddress: string
  amount: string
  direction: "incoming" | "outgoing"
  label: string
  timeStamp: Date
  from: string
  to: string
  gas?: string
  txHash: string
  nativeToken?: TokenInfo
  priceNative?: string
  priceToken?: string
  incoming: boolean
  showChainName: boolean
}

type ActivityHistoryItemProps = {
  historyItem: ActivityHistoryItem
  renderingAllTokens?: boolean
  onClick: () => void
}

function formatTokenValueStr(
  amount: string,
  symbol: string,
  isIncoming: boolean,
): JSX.Element {
  const tokenValueStr = formatTokenAmount(amount, symbol)
  const [integerPart, decimalPart] = tokenValueStr.split(".")
  const sign = isIncoming ? "+" : "-"
  const color = isIncoming ? "var(--token-success)" : "var(--token-error)"

  return (
    <span style={{ color }} translate="no">
      {sign}
      <span>{integerPart}</span>
      {decimalPart && <span className="text-xs">.{decimalPart}</span>}
    </span>
  )
}

export const ActivityHistoryItem = ({
  historyItem,
  onClick,
  renderingAllTokens = false,
}: ActivityHistoryItemProps) => {
  const {
    chainId,
    symbol,
    name,
    label,
    timeStamp,
    amount,
    incoming,
    tokenAddress,
  } = historyItem

  return (
    <div className="flex justify-between py-2 cursor-pointer" onClick={onClick}>
      {/* left side */}
      <div className="flex items-center gap-3">
        <TokenLogo
          address={tokenAddress}
          chainId={chainId}
          alt={name}
          showChainBadge={renderingAllTokens}
        />
        <div className="flex flex-col">
          <span className="text-base font-semibold">{name}</span>
          <h6 className="text-[#999]">{truncateString(label, 10)}</h6>
        </div>
      </div>
      {/* right side */}
      <div className="text-right">
        <div className={"flex flex-col items-right"}>
          <h4>{amount && formatTokenValueStr(amount, symbol, incoming)}</h4>
          <h6 className="text-[#999]">{timeStamp.toLocaleString()}</h6>
        </div>
      </div>
    </div>
  )
}
