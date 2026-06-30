import { useEffect } from "react"
import { parseUnits } from "ethers/utils"
import useSWRImmutable from "swr/immutable"
import { useSnapshot } from "valtio"
import { xrpToDrops } from "xrpl"

import { getChainProvider } from "@/chain/provider/provider"
import {
  BITCOIN_FAMILY,
  BITCOIN_TESTNET_FAMILY,
  DOGE_FAMILY,
  DOGE_TESTNET_FAMILY,
  XRP_FAMILY,
  XRP_TESTNET_FAMILY,
} from "@/chain/types"
import {
  type BroadcastRequest,
  craftERC20TransferCalldata,
  estimateGasLimit,
  estimateTypeAndFees,
  isNativeToken,
  parseAmount,
  ZERO_ADDRESS,
} from "@/ethers-utils"
import { useTokenBalances } from "@/hooks/useTokenBalances"
import { sessionState } from "@/login/context/SessionContext/storage"
import { useSelectedCurrency } from "@/stores/currencyStore"
import type { TokenIdentifier } from "@/tokens/types"

import { DECIMALS_FOR_FIAT_DISPLAY } from "../constants"
import {
  DEFAULT_ERC20_GAS_LIMIT,
  DEFAULT_NATIVE_GAS_LIMIT,
} from "./evmTransaction"
import { useFormSnapshot } from "./form"

const getEVMGasLimit = async (
  from: string,
  to: string,
  amountNativeUnits: bigint,
  selectedToken: TokenIdentifier,
  isSelectedTokenERC20: boolean,
) => {
  const defaultGasLimit = isSelectedTokenERC20
    ? DEFAULT_ERC20_GAS_LIMIT
    : DEFAULT_NATIVE_GAS_LIMIT
  try {
    const callData: BroadcastRequest["data"] = isSelectedTokenERC20
      ? craftERC20TransferCalldata(selectedToken.address, BigInt(0))
      : undefined

    const broadcastRequest: BroadcastRequest = {
      chainId: selectedToken.chainId,
      to: isSelectedTokenERC20 ? selectedToken.address : to,
      value: isSelectedTokenERC20 ? BigInt(0) : amountNativeUnits,
      data: callData,
    }
    const gasLimit = await estimateGasLimit(from, broadcastRequest)
    return gasLimit ?? defaultGasLimit
  } catch {
    return defaultGasLimit
  }
}

export const useSelectedTokens = () => {
  const { tokenId } = useFormSnapshot()
  const { balances, tokens, isLoading, isValidating, error } =
    useTokenBalances()

  const selectedToken = tokenId && tokens?.getBy(tokenId)
  const selectedTokenBalance = tokenId && balances?.byChain.getBy(tokenId)

  const selectedNativeToken = tokenId && tokens?.getNativeBy(tokenId)
  const selectedNativeTokenBalance =
    tokenId && balances?.byChain.getNativeBy(tokenId)

  const isSelectedTokenERC20 =
    selectedToken &&
    selectedNativeToken &&
    !selectedToken.isEqual(selectedNativeToken)

  return {
    isLoading,
    isValidating,
    error,
    selectedToken,
    selectedTokenBalance,
    selectedNativeToken,
    selectedNativeTokenBalance,
    isSelectedTokenERC20,
  }
}

export const useAmountUnits = () => {
  const { selectedToken } = useSelectedTokens()
  const { amountInCrypto } = useFormSnapshot()

  if (!selectedToken || !amountInCrypto) {
    return
  }

  return parseUnits(amountInCrypto, selectedToken.decimals)
}

export const useAmountLimits = () => {
  const {
    selectedToken,
    selectedNativeToken,
    selectedTokenBalance,
    selectedNativeTokenBalance,
    isSelectedTokenERC20,
  } = useSelectedTokens()
  const { prices } = useTokenBalances()
  const selectedCurrency = useSelectedCurrency()

  const addresses = useSnapshot(sessionState).addresses

  const { data: networkCostNativeUnits, error } = useSWRImmutable(
    selectedToken && isSelectedTokenERC20 !== undefined && addresses
      ? [
          selectedToken,
          isSelectedTokenERC20,
          addresses,
          "estimateNetworkFeeForSend",
        ]
      : null,
    async ([selectedToken, isSelectedTokenERC20, addresses]) => {
      const chainUtils = getChainProvider(selectedToken.chainId)
      switch (chainUtils.family) {
        case BITCOIN_FAMILY:
        case BITCOIN_TESTNET_FAMILY:
        case DOGE_FAMILY:
        case DOGE_TESTNET_FAMILY: {
          const feePerByteSats = await chainUtils.getNetworkFeeSatsPerByte()
          const bytesRequired = chainUtils.calculateNetworkFeeBytesRequired(
            2,
            2,
          )
          return BigInt(Math.ceil(feePerByteSats * bytesRequired))
        }
        case XRP_FAMILY:
        case XRP_TESTNET_FAMILY: {
          const fees = await chainUtils.getNetworkFee()
          const totalFee = xrpToDrops(fees.baseFee * fees.loadFactor)
          return BigInt(totalFee)
        }
        case "EVM": {
          const broadcastOptions = await estimateTypeAndFees(
            selectedToken.chainId,
          )
          const gasPrice =
            broadcastOptions.type === 0
              ? broadcastOptions.gasPrice
              : broadcastOptions.maxFeePerGas

          const evmAddress = addresses.get("EVM") ?? ZERO_ADDRESS
          const gasLimit = await getEVMGasLimit(
            evmAddress,
            evmAddress,
            BigInt(0),
            selectedToken,
            isSelectedTokenERC20,
          )
          return gasPrice * gasLimit
        }
        case "SOLANA":
        case "SOLANA_DEVNET":
          return isNativeToken(selectedToken.address)
            ? BigInt(5000)
            : BigInt(10000)
        default:
          throw new Error("Unsupported chain family")
      }
    },
    {
      refreshInterval: 30000,
      keepPreviousData: true,
    },
  )

  useEffect(() => {
    if (error) {
      console.error("error", error)
    }
  }, [error])

  if (
    !selectedToken ||
    !selectedTokenBalance ||
    !selectedNativeToken ||
    !networkCostNativeUnits ||
    isSelectedTokenERC20 === undefined
  ) {
    return undefined
  }

  let minUnits = 1
  const chainUtils = getChainProvider(selectedToken.chainId)
  switch (chainUtils.family) {
    case BITCOIN_FAMILY:
    case BITCOIN_TESTNET_FAMILY:
    case DOGE_FAMILY:
    case DOGE_TESTNET_FAMILY:
    case XRP_TESTNET_FAMILY:
    case XRP_FAMILY:
      minUnits = chainUtils.DUST_AMOUNT
      break
    default:
      minUnits = 1
  }
  const minAmount = parseAmount(minUnits, selectedToken.decimals).toString()

  const nativeTokenBalanceUnits = parseUnits(
    selectedNativeTokenBalance?.amount ?? "0",
    selectedNativeToken.decimals,
  )
  if (nativeTokenBalanceUnits < networkCostNativeUnits) {
    return {
      minAmount,
      maxAmount: "0",
    }
  }

  let maxAmount = selectedTokenBalance.amount
  if (!isSelectedTokenERC20 && networkCostNativeUnits !== undefined) {
    maxAmount = parseAmount(selectedTokenBalance.amount)
      .sub(parseAmount(networkCostNativeUnits, selectedNativeToken.decimals))
      .toString()
  }

  const tokenPrice = prices?.getBy(selectedToken)
  const maxAmountUSD =
    tokenPrice !== undefined ? Number(maxAmount) * Number(tokenPrice) : 0
  const minAmountUSD =
    tokenPrice !== undefined ? Number(minAmount) * Number(tokenPrice) : 0
  const minAmountToTarget = minAmountUSD * selectedCurrency.usdExchangeRate
  const maxAmountToTarget = maxAmountUSD * selectedCurrency.usdExchangeRate
  let minAmountSelectedCurrency =
    tokenPrice !== undefined ? minAmountToTarget.toString() : "0"
  let maxAmountSelectedCurrency =
    tokenPrice !== undefined ? maxAmountToTarget.toString() : "0"

  if (
    selectedCurrency.currency === "USD" ||
    selectedCurrency.currency === "EUR"
  ) {
    minAmountSelectedCurrency = Number(minAmountSelectedCurrency).toFixed(
      DECIMALS_FOR_FIAT_DISPLAY,
    )
    maxAmountSelectedCurrency = Number(maxAmountSelectedCurrency).toFixed(
      DECIMALS_FOR_FIAT_DISPLAY,
    )
  }

  return {
    minAmount,
    maxAmount,
    minAmountSelectedCurrency,
    maxAmountSelectedCurrency,
  }
}
