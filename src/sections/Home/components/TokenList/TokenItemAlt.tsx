"use client"

import { Icon } from "ui"

import { TokenLogo } from "@/components/TokenLogo/TokenLogo"
import {
  formatTokenAmount,
  formatTokenValue,
} from "@/components/Utils/tokenFormat"
import type { SelectedCurrency } from "@/stores/currencyStore"

import type { TokenItem } from "./types"

type TokenItemViewProps = {
  token: TokenItem
  isSelected?: boolean
  selectedCurrency: SelectedCurrency
  onClick?: () => void
}

export const TokenItemViewAlt = ({
  token,
  isSelected,
  selectedCurrency,
  onClick,
}: TokenItemViewProps) => {
  const { address, chainId, symbol, name, usdValue, amount } = token

  return (
    <div onClick={onClick}>
      <div className="flex justify-between py-2">
        {/* left side */}
        <div className="flex items-center gap-3">
          <TokenLogo address={address} chainId={chainId} alt={name} />

          <div className="flex flex-col justify-items-end">
            <div className="flex flex-row items-center gap-2">
              <h4 translate="no">
                {symbol} <span className="text-xs font-light">{name}</span>
              </h4>
            </div>

            <div className="font-normal text-xs text-gray-3" translate="no">
              {amount && symbol && <>{formatTokenAmount(amount, symbol)}</>}{" "}
              {usdValue
                ? `(${formatTokenValue(usdValue, selectedCurrency)})`
                : ""}
            </div>
          </div>
        </div>
        {/* right side */}

        <div className="flex justify-center items-center gap-3 text-right">
          {isSelected && <Icon name="BsCheckLg" size="big" />}
        </div>
      </div>
    </div>
  )
}
