import type { Token, TokensResponse } from "@lifi/sdk"
import { getAddress } from "viem"

import { BNB_CHAIN_ID, CELO_CHAIN_ID, DOGE_CHAIN_ID } from "@/chain/chain-ids"
import { AVAILABLE_CHAINS } from "@/chain/chains"
import { getChainProvider } from "@/chain/provider/provider"
import { EVM_FAMILY } from "@/chain/types"
import {
  CELO_ADDRESS,
  DOGE_NATIVE_ADDRESS,
  XRP_NATIVE_ADDRESS,
  ZERO_ADDRESS,
} from "@/ethers-utils"

import { BLACKLIST_TOKENS } from "./blacklistTokens"
import { BLACKLIST_TOKENS_MARKETCAP } from "./blacklistTokensMarketCap"
import { FALLBACK_TOKENS } from "./fallbackTokens"
import { getGoodDollarPrice } from "./onChainGoodDollarPrice"
import type { SelectToken, SelectTokens } from "./types"

export const mutateApplyBlacklist = (tokens: SelectTokens) => {
  for (const [chainId, blacklistForChain] of BLACKLIST_TOKENS.entries()) {
    const tokensInChain = tokens[chainId]
    if (!tokensInChain) {
      continue
    }

    const result = tokensInChain.filter((token: SelectToken) => {
      const isBlacklisted =
        blacklistForChain.has(token.address) ||
        blacklistForChain.has(token.address.toLowerCase())
      return !isBlacklisted
    })

    tokens[chainId] = result
  }
}

export const mutateApplyBlacklistForMarketCap = (tokens: SelectTokens) => {
  for (const [
    chainId,
    blacklistForChain,
  ] of BLACKLIST_TOKENS_MARKETCAP.entries()) {
    const tokensOfChain = tokens[chainId]
    if (!tokensOfChain) {
      continue
    }

    const result = tokensOfChain.map((token: SelectToken) => {
      const chain = AVAILABLE_CHAINS.get(chainId)
      if (chain) {
        const isBlacklisted =
          blacklistForChain.has(token.address) ||
          (chain.family === "EVM" &&
            blacklistForChain.has(token.address.toLowerCase()))

        if (isBlacklisted) {
          token.marketCapUSD = null
          token.priceUSD = null
        }
      }
      return token
    })

    tokens[chainId] = result
  }
}

export const mutateRemoveUnavailableChains = (tokens: SelectTokens) => {
  Object.keys(tokens).forEach((chainId) => {
    const parsedChainId = parseInt(chainId)
    if (!AVAILABLE_CHAINS.get(parsedChainId)) {
      delete tokens[parsedChainId]
    }
  })
}

export const addFallbackTokens = async (tokens: TokensResponse) => {
  for (const [chainId, fallbackTokensForChain] of FALLBACK_TOKENS.entries()) {
    if (!AVAILABLE_CHAINS.get(chainId)) {
      continue
    }
    const tokensForChain = tokens.tokens[chainId] ?? []
    const existingAddress = new Set(
      tokensForChain.map((t) => t.address.toLowerCase()),
    )

    for (const [
      fallbackAddress,
      fallbackTokenInfo,
    ] of fallbackTokensForChain.entries()) {
      if (existingAddress.has(fallbackAddress.toLowerCase())) {
        continue
      }
      const { family } = getChainProvider(chainId)

      // in case of EVM, calculate the checksum address
      const address =
        family === EVM_FAMILY ? getAddress(fallbackAddress) : fallbackAddress

      const token = {
        ...fallbackTokenInfo,
        priceUSD: "",
        address,
        chainId: chainId,
      }

      const fallbackPrice = await getPriceUSDForFallbackToken(token, tokens)
      if (fallbackPrice) {
        token.priceUSD = fallbackPrice
      }
      tokensForChain.push(token)
    }

    tokens.tokens[chainId] = tokensForChain
  }
}

const getPriceUSDForFallbackToken = async (
  token: Token,
  tokensLifi: TokensResponse,
): Promise<string | undefined> => {
  try {
    if (token.symbol === "G$") {
      return await getGoodDollarPrice()
    } else if (
      token.chainId === Number(DOGE_CHAIN_ID) &&
      token.address === DOGE_NATIVE_ADDRESS
    ) {
      return getDOGEPriceFromBNB(tokensLifi)
    } else if (token.symbol === "XRP" && token.address === XRP_NATIVE_ADDRESS) {
      return getXrpPriceFromBNB(tokensLifi)
    } else if (
      token.chainId === Number(CELO_CHAIN_ID) &&
      token.address === ZERO_ADDRESS
    ) {
      return getCeloPriceFromCELO(tokensLifi)
    }
  } catch (err: unknown) {
    console.warn(
      `Price for token: ${token.symbol} in chain: ${token.chainId} was not found`,
      err,
    )
  }
  return undefined
}

const getDOGEPriceFromBNB = (tokensLifi: TokensResponse): string => {
  let priceUSD: string | null | undefined
  const binancePeggedDogeAddress = "0xbA2aE424d960c26247Dd6c32edC70B295c744C43"
  for (const token of tokensLifi.tokens[BNB_CHAIN_ID]) {
    if (
      token.address.toLowerCase() === binancePeggedDogeAddress.toLowerCase()
    ) {
      priceUSD = token.priceUSD
    }
  }
  if (!priceUSD) throw new Error("DOGE price not found in BNB chain")
  return priceUSD
}

const getXrpPriceFromBNB = (tokensLifi: TokensResponse): string => {
  let priceUSD: string | null | undefined
  const binancePeggedXRPAddress = "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE"
  for (const token of tokensLifi.tokens[BNB_CHAIN_ID]) {
    if (token.address.toLowerCase() === binancePeggedXRPAddress.toLowerCase()) {
      priceUSD = token.priceUSD
    }
  }
  if (!priceUSD) throw new Error("XRP price not found in BNB chain")
  return priceUSD
}

const getCeloPriceFromCELO = (tokensLifi: TokensResponse): string => {
  let celoPrice: string | null | undefined
  for (const token of tokensLifi.tokens[CELO_CHAIN_ID]) {
    if (token.address.toLowerCase() === CELO_ADDRESS) {
      celoPrice = token.priceUSD
    }
  }
  if (!celoPrice) throw new Error("CELO price not found")
  return celoPrice
}
