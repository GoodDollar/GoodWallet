"use client"

import { useMemo } from "react"
import Image from "next/image"
import { Slide1, Text } from "ui"

import { getChainName } from "@/chain/chains"
import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import { useTokenBalances } from "@/hooks/useTokenBalances"
import { useSelectedCurrency } from "@/stores/currencyStore"
import type { TokenIdentifier } from "@/tokens/types"
import { useTranslation } from "@/translations"

import { TokenItemView } from "./TokenItem"
import { TokenItemViewAlt } from "./TokenItemAlt"

export type TokenListProps = {
  selectedChainId?: number
  selectedTokenIdentifier?: TokenIdentifier
  onTokenIdentifierChange?: (tokenId: TokenIdentifier) => void
  hasDivider?: boolean
  useAlt?: boolean
}

export const TokenList = ({
  selectedChainId,
  selectedTokenIdentifier,
  onTokenIdentifierChange,
  hasDivider,
  useAlt = false,
}: TokenListProps) => {
  const { balances, tokens, isLoading } = useTokenBalances()
  const selectedCurrency = useSelectedCurrency()
  const { translations } = useTranslation()

  const tokenList = useMemo(
    () =>
      tokens &&
      balances &&
      balances.byUsdValue.flatMap((balance) => {
        const token = tokens.getBy(balance)
        const { chainId } = balance

        if (selectedChainId && chainId !== selectedChainId) {
          return []
        }

        return token === undefined
          ? []
          : [
              {
                ...token,
                ...balance,
                chainName: getChainName(chainId),
              },
            ]
      }),
    [tokens, balances, selectedChainId],
  )

  return (
    <div
      className={`flex flex-col overflow-y-auto ${hasDivider && "divide-y divide-gray-3"}`}
    >
      {tokenList && tokenList.length > 0 ? (
        tokenList.map((token) =>
          useAlt ? (
            <TokenItemViewAlt
              key={`${token.address}-${token.chainId}`}
              token={token}
              selectedCurrency={selectedCurrency}
              isSelected={selectedTokenIdentifier?.isEqual(token)}
              onClick={() => onTokenIdentifierChange?.(token)}
            />
          ) : (
            <TokenItemView
              key={`${token.address}-${token.chainId}`}
              token={token}
              selectedCurrency={selectedCurrency}
              isSelected={selectedTokenIdentifier?.isEqual(token)}
              onClick={() => onTokenIdentifierChange?.(token)}
            />
          ),
        )
      ) : isLoading ? (
        <div className="mt-20">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 filter grayscale">
          <Image src={Slide1} alt="" width={64} height={64} />
          <Text align="center" style="20-600" color="text-tertiary">
            {translations.home.noTokens.title}
          </Text>
          <Text
            align="center"
            style="14-400"
            color="text-tertiary"
            className="whitespace-pre-line"
          >
            {translations.home.noTokens.description}
          </Text>
        </div>
      )}
    </div>
  )
}
