import type { FixedNumber } from "ethers/utils"
import { isAddress } from "viem"

import { AnalyticsEventTypes } from "@/analytics/types"
import { captureEvent } from "@/analytics/useAnalytics"
import { ETHEREUM_CHAIN_ID } from "@/chain/chain-ids"
import { EVM_FAMILY } from "@/chain/types"
import { config } from "@/config"
import {
  getEthersProvider,
  parseAmount,
  parseAmountBytes,
} from "@/ethers-utils"
import type { Tx } from "@/hooks/useLedger/types"
import { NormalizedAddressMap } from "@/hooks/useTokenBalances/NormalizedAddressMap"

import * as alchemy from "../EVM/alchemy"
import * as multicall from "../EVM/multicall"
import type { EVMProvider } from "./types"

const alchemySupportedChainIds = config.alchemyConfig.chainIds as number[]

export const getEVMProvider = (): EVMProvider => {
  return {
    family: EVM_FAMILY,
    getAddressForName: async (name) => {
      try {
        const ethersProvider = getEthersProvider(ETHEREUM_CHAIN_ID)
        return await ethersProvider.resolveName(name)
      } catch (e) {
        console.warn(`Failed to get address for ENS ${name}`, e)
        return null
      }
    },
    getNameForAddress: async (address) => {
      try {
        const ethersProvider = getEthersProvider(ETHEREUM_CHAIN_ID)
        return await ethersProvider.resolveName(address)
      } catch (e) {
        console.warn(`Failed to get Name for Address ${address}`, e)
        return null
      }
    },
    isValidAddress: isAddress,
    getAmounts: async (chainId, tokensOfChain, address) => {
      if (!alchemySupportedChainIds.includes(chainId)) {
        return multicall.getAmounts(chainId, tokensOfChain, address)
      }
      const rpc = config.rpcUrls[chainId]
      if (!rpc) {
        throw Error(`RPC for chainId ${chainId} does not exist`)
      }

      const amountsForChain = new NormalizedAddressMap<string, FixedNumber>(
        EVM_FAMILY,
      )
      const alchemyTokenBalancesPromise = alchemy.getTokenBalances(rpc, address)
      const nativeToken = tokensOfChain.native
      if (nativeToken) {
        const ethersProvider = getEthersProvider(chainId)
        const nativeBalanceWei = await ethersProvider.getBalance(address)
        if (nativeBalanceWei > 0) {
          const nativeBalance = parseAmount(
            nativeBalanceWei,
            nativeToken.decimals,
          )
          amountsForChain.set(nativeToken.address, nativeBalance)
        }
      }
      try {
        const alchemyAmounts = await alchemyTokenBalancesPromise
        for (const [address, amountWei] of alchemyAmounts) {
          const token = tokensOfChain.get(address)
          if (token) {
            const balance = parseAmountBytes(amountWei, token.decimals)
            amountsForChain.set(address, balance)
          }
        }
      } catch (e) {
        console.error(`Error getting alchemy balance for chainId ${chainId}`, e)
        captureEvent({
          type: AnalyticsEventTypes.TokenBalanceError,
          chainId,
          reason: e instanceof Error ? e.message : "Unknown",
        })
      }
      return amountsForChain
    },
    // call this from the client, move the switch server side
    getTransactions: async (chainId, address) => {
      try {
        const res = await fetch(
          `/api/chains/EVM/addresses/${address}/history?chainId=${chainId}`,
        )
        if (res.status === 200) {
          const resParsed = (await res.json()) as Tx[]
          return resParsed
        } else {
          return []
        }
      } catch (error) {
        console.error(error)
      }
      return []
    },
  }
}
