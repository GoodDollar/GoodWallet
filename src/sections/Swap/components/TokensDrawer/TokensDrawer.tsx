"use client"

import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { useDebouncedEffect } from "@react-hookz/web"
import { Box, Button, Drawer, Icon, Text } from "ui"

import { AVAILABLE_CHAINS_IDS, getChainName } from "@/chain/chains"
import { CryptoOnRampGuide } from "@/components/CryptoOnRampGuide/CryptoOnRampGuide"
import { TokenLogo } from "@/components/TokenLogo/TokenLogo"
import { getChainIcon } from "@/components/Typo/ChainIcon"
import {
  formatTokenAmount,
  formatTokenPrice,
  formatTokenValue,
} from "@/components/Utils/tokenFormat"
import { useTokenBalances } from "@/hooks/useTokenBalances"
import {
  type SelectedCurrency,
  useSelectedCurrency,
} from "@/stores/currencyStore"
import type { TokenBalance, TokenIdentifier, TokenInfo } from "@/tokens/types"
import { useTranslation } from "@/translations"

import { TokenInfoSlider } from "../TokenInfoSlider/TokenInfoSlider"
import styles from "./TokensDrawer.module.css"

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Token = TokenIdentifier & TokenInfo

// Full Token is constructed to avoid having to recompute balance and price lookups multiple times
type FullToken = { token: Token; balance?: TokenBalance; priceUsd?: string }

type TokenFilterMode = "onlyTokensWithBalance" | "allTokens"
type ChainSelection = number | "all"

interface TokensDrawerProps {
  isOpen: boolean
  filter: TokenFilterMode
  onClose: () => void
  onSelect: (token: Token) => void
  openDrawer?: "origin" | "target"
  selectedToken?: Token
  defaultChainId?: number
}

// ─────────────────────────────────────────────────────────────
// Main Component
// Full-screen drawer showing chain tabs + searchable token list
// Layout: [Chain Pills] → [Search Box] → [Token List]
// ─────────────────────────────────────────────────────────────

export const TokensDrawer = ({
  isOpen,
  filter,
  onClose,
  onSelect,
  selectedToken,
  defaultChainId,
}: TokensDrawerProps) => {
  const { tokens, prices, balances } = useTokenBalances()
  const { translations } = useTranslation()

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery)

  const [selectedChainId, setSelectedChainId] = useState<ChainSelection>("all")
  const [detailsToken, setDetailsToken] = useState<Token>()
  const selectedCurrency = useSelectedCurrency()

  useDebouncedEffect(
    () => {
      setDebouncedSearchQuery(searchQuery.trim().toLowerCase())
    },
    [searchQuery],
    300,
  )

  // Reset chain filter when drawer opens with a default chain
  useEffect(() => {
    if (!selectedToken && defaultChainId && isOpen) {
      setSelectedChainId(defaultChainId)
    }
  }, [selectedToken, defaultChainId, isOpen])

  // Memoize this computation to avoid recreating the array on every render
  const filteredFullTokens = useMemo(() => {
    const fullTokens: FullToken[] = []
    tokens?.forEach((chainTokens) => {
      chainTokens.forEach((token) => {
        const balance = balances?.byChain.getBy(token)
        const priceUsd = prices?.getBy(token)
        const hasBalance = !!balance?.amount
        const passesFilter =
          filter === "allTokens" ||
          (filter === "onlyTokensWithBalance" && hasBalance)
        if (passesFilter) {
          fullTokens.push({ token, balance, priceUsd })
        }
      })
    })
    return fullTokens
  }, [tokens, balances, prices, filter])

  // ─── Chain filter pills (horizontal scrollable) ───
  const availableChainIds = useMemo(() => {
    const chainIds = new Set(filteredFullTokens.map((ft) => ft.token.chainId))
    return AVAILABLE_CHAINS_IDS.filter((chainId) => chainIds.has(chainId))
  }, [filteredFullTokens])

  const filteredFullTokensForSelectedChain = useMemo(() => {
    return selectedChainId === "all"
      ? filteredFullTokens
      : filteredFullTokens.filter((tb) => tb.token.chainId === selectedChainId)
  }, [filteredFullTokens, selectedChainId])

  // ─── Filtered & sorted token list ───
  const searchedTokens = useMemo(() => {
    // Apply search filter
    const tokensAfterSearchFilter = filteredFullTokensForSelectedChain.filter(
      ({ token }) =>
        token.symbol.toLowerCase().includes(debouncedSearchQuery) ||
        token.name.toLowerCase().includes(debouncedSearchQuery) ||
        token.address.toLowerCase().includes(debouncedSearchQuery),
    )

    const minVolume = 10_000
    const getMcap = (token: Token) => {
      return (token.volumeUSD24H ?? 0) > minVolume
        ? (token.marketCapUSD ?? 0)
        : 0
    }

    // Sort: highest USD value first, fallback to market cap where there's volume
    const sortedTokens = tokensAfterSearchFilter.sort((tokenA, tokenB) => {
      const usdValueA = tokenA.balance?.hasValue
        ? Number(tokenA.balance.usdValue)
        : 0
      const usdValueB = tokenB.balance?.hasValue
        ? Number(tokenB.balance.usdValue)
        : 0
      if (usdValueA || usdValueB) {
        return usdValueB - usdValueA
      }
      return getMcap(tokenB.token) - getMcap(tokenA.token)
    })

    return sortedTokens.slice(0, 100)
  }, [filteredFullTokensForSelectedChain, debouncedSearchQuery])

  // ─── Stable callbacks for memoized children ───
  const closeDetailsDrawer = useCallback(() => setDetailsToken(undefined), [])

  // ─── Empty state: no tokens with balance → show onramp guide ───
  if (filter === "onlyTokensWithBalance" && !balances?.byUsdValue.length) {
    return (
      <Drawer open={isOpen} onClose={onClose}>
        <CryptoOnRampGuide />
      </Drawer>
    )
  }

  return (
    <>
      <Drawer open={isOpen} onClose={onClose} height="full">
        <Box vertical>
          {/* ─── Horizontal chain selector pills ─── */}
          <ChainPillList
            chainIds={availableChainIds}
            selectedChainId={selectedChainId}
            onSelectChain={setSelectedChainId}
          />

          {/* ─── Search input with clear button ─── */}
          <SearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={translations.swap.searchPlaceholder}
          />

          {/* ─── Scrollable token list ─── */}
          <Box vertical scroll gap="none">
            {searchedTokens.map(({ token, balance, priceUsd }) => (
              <TokenRow
                key={`${token.chainId}-${token.address}`}
                token={token}
                price={priceUsd}
                balance={balance}
                isSelected={
                  token.address === selectedToken?.address &&
                  token.chainId === selectedToken?.chainId
                }
                showChainBadge={selectedChainId === "all"}
                selectedCurrency={selectedCurrency}
                onSelect={onSelect}
                onShowDetails={setDetailsToken}
              />
            ))}
          </Box>
        </Box>
      </Drawer>

      {/* ─── Token detail drawer (opens on ⋯ tap) ─── */}
      {detailsToken && (
        <Drawer open onClose={closeDetailsDrawer}>
          <TokenInfoSlider token={detailsToken} />
        </Drawer>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// ChainPillList - Horizontal scrollable chain selector
// Visual: [All] [Ethereum] [Polygon] [Arbitrum] ...
// Desktop: grab + drag to scroll | Mobile: swipe | CSS snap
// ─────────────────────────────────────────────────────────────

const ChainPillList = ({
  chainIds,
  selectedChainId,
  onSelectChain,
}: {
  chainIds: number[]
  selectedChainId: ChainSelection
  onSelectChain: (chainId: ChainSelection) => void
}) => {
  return (
    <Box scroll gap="small">
      <ChainPill
        chainId={null}
        isSelected={selectedChainId === "all"}
        onSelect={onSelectChain}
      />
      {chainIds.map((chainId) => (
        <ChainPill
          key={chainId}
          chainId={chainId}
          isSelected={selectedChainId === chainId}
          onSelect={onSelectChain}
        />
      ))}
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────
// ChainPill - Single chain button with icon + name
// Visual: [🔷 Ethereum]
// ─────────────────────────────────────────────────────────────

const ChainPill = memo(function ChainPill({
  chainId,
  isSelected,
  onSelect,
}: {
  chainId: number | null
  isSelected: boolean
  onSelect: (chainId: ChainSelection) => void
}) {
  const chainSelection: ChainSelection = chainId ?? "all"
  const chainName = chainId ? getChainName(chainId) : "All"
  const handleClick = useCallback(
    () => onSelect(chainSelection),
    [onSelect, chainSelection],
  )

  return (
    <Box
      vertical
      space="around"
      width="small"
      height="small"
      elevation="high"
      selected={isSelected}
      onClick={handleClick}
      padding="small"
      gap="small"
      radius="small"
      border="default"
    >
      <Icon name={getChainIcon(chainId)} size="larger" round />
      <Text style="12-400" color="text-secondary" align="center" truncate>
        {chainName}
      </Text>
    </Box>
  )
})

// ─────────────────────────────────────────────────────────────
// SearchBox - Input with search icon + clear button
// Visual: [🔍 Search tokens...              ✕]
// ─────────────────────────────────────────────────────────────

const SearchBox = memo(function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange(event.currentTarget.value),
    [onChange],
  )
  const handleClear = useCallback(() => onChange(""), [onChange])

  return (
    <Box
      border="default"
      elevation="high"
      gap="small"
      padding="small"
      radius="large"
    >
      <Icon name="BsSearch" />
      <input
        title="Search field"
        className={styles.searchInput}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
      />
      {value && (
        <Button
          variant="icon"
          icon="BsXCircleFill"
          size="small"
          onClick={handleClear}
        />
      )}
    </Box>
  )
})

// ─────────────────────────────────────────────────────────────
// TokenRow - Single token entry with logo, name, balance, menu
// Visual: [🪙 ETH    $3,200]  [$1,234.56]  [⋯]
//         [   Ether        ]  [0.385 ETH ]
// ─────────────────────────────────────────────────────────────

const TokenRow = memo(function TokenRow({
  token,
  price,
  balance,
  isSelected,
  showChainBadge,
  selectedCurrency,
  onSelect,
  onShowDetails,
}: {
  token: Token
  price?: string
  balance?: TokenBalance
  isSelected: boolean
  showChainBadge: boolean
  selectedCurrency: SelectedCurrency
  onSelect: (token: Token) => void
  onShowDetails: (token: Token) => void
}) {
  const handleSelect = useCallback(() => onSelect(token), [onSelect, token])
  return (
    <div
      className={`${styles.tokenBox} ${isSelected ? styles.tokenBoxSelected : ""}`}
      onClick={handleSelect}
    >
      {/* Token icon with optional chain badge */}
      <TokenLogo
        address={token.address}
        chainId={token.chainId}
        alt={token.name}
        style={{ borderRadius: 50 }}
        showChainBadge={showChainBadge}
      />

      {/* Symbol + price column */}
      <div className={styles.tokenSymbolContainer}>
        <Text style="16-600" truncate>
          {token.symbol}
        </Text>
        {price && (
          <Text style="12-400" color="text-secondary">
            {formatTokenPrice(price, selectedCurrency)}
          </Text>
        )}
      </div>

      {/* Balance column (only if user has this token) */}
      {balance && (
        <div className={styles.tokenBalanceContainer}>
          <Text style="14-600" align="right">
            {balance.amount && formatTokenAmount(balance.amount, token.symbol)}
          </Text>
          <Text style="12-400" color="text-secondary" align="right">
            {balance.hasValue &&
              formatTokenValue(balance.usdValue, selectedCurrency)}
          </Text>
        </div>
      )}

      <span onClick={(e) => e.stopPropagation()}>
        <Button
          variant="square"
          icon="ThreeDots"
          onClick={() => onShowDetails(token)}
        />
      </span>
    </div>
  )
})
