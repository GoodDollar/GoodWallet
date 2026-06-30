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
  selectedCurrency: SelectedCurrency
  isSelected?: boolean
  onClick?: () => void
}

export const TokenItemView = ({
  token,
  selectedCurrency,
  isSelected,
  onClick,
}: TokenItemViewProps) => {
  const { symbol, name, usdValue, amount, chainId, address } = token

  return (
    <div onClick={onClick}>
      <div className="flex justify-between py-2">
        {/* left side */}
        <div className="flex items-center gap-3">
          <TokenLogo address={address} chainId={chainId} alt={name} />

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h4>{symbol}</h4>
            </div>
            <h6>{name}</h6>
          </div>
        </div>
        {/* right side */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex flex-col items-right">
              {isSelected && <Icon name="BsCheckLg" size="big" />}
              <h4>
                {amount && symbol && <>{formatTokenAmount(amount, symbol)}</>}
              </h4>
              <h6>
                {usdValue ? formatTokenValue(usdValue, selectedCurrency) : ""}
              </h6>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
