import { useCallback } from "react"
import { parseUnits } from "ethers/utils"
import type { SWRConfiguration, SWRResponse } from "swr"
import { default as useSWRImmutable } from "swr/immutable"
import { useSnapshot } from "valtio"

import {
  type BroadcastOptions,
  type BroadcastRequest,
  craftERC20TransferCalldata,
  estimateGasLimit,
  estimateTypeAndFees,
  isAmountSafe,
  isValidEvmAddress,
  normalizeEvmAddress,
  parseAmount,
  sendTx,
  ZERO_ADDRESS,
} from "ethers-utils"
import { TxDirection } from "@/hooks/useLedger/types"
import { useSessionContext } from "@/login"
import { activityHistoryStore } from "@/stores/transactionHistoryStore"
import { mulWithTokenBalanceUsdPrice } from "@/tokens/utils"

import { useFormSnapshot } from "./form"
import {
  useAmountLimits,
  useAmountUnits,
  useSelectedTokens,
} from "./transaction"

export const DEFAULT_ERC20_GAS_LIMIT = BigInt(400_000)
export const DEFAULT_NATIVE_GAS_LIMIT = BigInt(21_000)

const useBroadcastRequest = () => {
  const { toAddress } = useFormSnapshot()
  const amountUnits = useAmountUnits()

  const { selectedToken, isSelectedTokenERC20 } = useSelectedTokens()

  const formIsReady = selectedToken

  return useSWRImmutable(
    formIsReady
      ? [toAddress, amountUnits, selectedToken, isSelectedTokenERC20]
      : null,
    ([_to, _amountUnits, selectedToken, isSelectedTokenERC20]) => {
      const chainId = selectedToken.chainId
      const amountUnits = _amountUnits ?? BigInt(0)
      const to = normalizeEvmAddress(_to ?? ZERO_ADDRESS, chainId)

      const callData: BroadcastRequest["data"] = isSelectedTokenERC20
        ? craftERC20TransferCalldata(to, amountUnits)
        : undefined
      const broadcastRequest: BroadcastRequest = {
        chainId,
        to: isSelectedTokenERC20 ? selectedToken.address : to,
        value: isSelectedTokenERC20 ? BigInt(0) : amountUnits,
        data: callData,
      }

      return broadcastRequest
    },
    { keepPreviousData: true },
  )
}

export const useBroadcastOptions = () => {
  const { tokenId } = useFormSnapshot()
  const selectedChainId = tokenId?.chainId

  return useEstimateTypeAndFees(selectedChainId)
}

const useGasLimit = () => {
  const { isSelectedTokenERC20 } = useSelectedTokens()
  const { data: broadcastRequest } = useBroadcastRequest()
  const { signer } = useSessionContext()
  const from = signer?.EVM.address
  return useSWRImmutable(
    broadcastRequest && from && isSelectedTokenERC20 !== undefined
      ? [broadcastRequest, from, isSelectedTokenERC20, "estimateGasLimit"]
      : null,
    async ([broadcastRequest, from, isSelectedTokenERC20]) => {
      const defaultGasLimit = isSelectedTokenERC20
        ? DEFAULT_ERC20_GAS_LIMIT
        : DEFAULT_NATIVE_GAS_LIMIT
      return (await estimateGasLimit(from, broadcastRequest)) ?? defaultGasLimit
    },
    { keepPreviousData: true },
  )
}

export const useGasCosts = () => {
  const { data: broadcastOptions } = useBroadcastOptions()
  const maxFeePerGas =
    broadcastOptions &&
    (broadcastOptions.type === 0
      ? broadcastOptions.gasPrice
      : broadcastOptions.maxFeePerGas)

  const { data: gasLimit } = useGasLimit()
  const {
    selectedToken,
    selectedNativeToken,
    selectedNativeTokenBalance,
    isSelectedTokenERC20,
  } = useSelectedTokens()

  if (
    maxFeePerGas === undefined ||
    gasLimit === undefined ||
    !selectedToken ||
    !selectedNativeToken ||
    isSelectedTokenERC20 === undefined
  ) {
    return
  }

  const maxGasCost = gasLimit * maxFeePerGas

  const nativeTokenBalanceUnits = parseUnits(
    selectedNativeTokenBalance?.amount ?? "0",
    selectedNativeToken.decimals,
  )

  const isOutOfGas = nativeTokenBalanceUnits < maxGasCost

  return {
    maxGasCost,
    isOutOfGas,
  }
}

export const useTotalCosts = () => {
  const { amountInCrypto } = useFormSnapshot()
  const amountUnits = useAmountUnits()
  const {
    selectedToken,
    selectedTokenBalance,
    selectedNativeToken,
    selectedNativeTokenBalance,
    isSelectedTokenERC20,
  } = useSelectedTokens()
  const gasCosts = useGasCosts()

  if (
    amountInCrypto === undefined ||
    amountUnits === undefined ||
    gasCosts === undefined ||
    selectedToken === undefined ||
    selectedTokenBalance === undefined ||
    selectedNativeToken === undefined ||
    selectedNativeTokenBalance === undefined ||
    isSelectedTokenERC20 === undefined
  ) {
    return
  }

  const selectedTokenAmountInUsd = mulWithTokenBalanceUsdPrice(
    amountInCrypto,
    selectedTokenBalance,
  )

  const maxGasCostUsd = mulWithTokenBalanceUsdPrice(
    parseAmount(gasCosts.maxGasCost, selectedNativeToken.decimals),
    selectedNativeTokenBalance,
  )

  const totalCostUsd =
    selectedTokenAmountInUsd && maxGasCostUsd
      ? selectedTokenAmountInUsd.add(maxGasCostUsd).toString()
      : undefined
  const totalSelectedTokenValueUnits =
    amountUnits + (isSelectedTokenERC20 ? BigInt(0) : gasCosts.maxGasCost)
  const totalSelectedNativeTokenValueUnits =
    gasCosts.maxGasCost + (isSelectedTokenERC20 ? BigInt(0) : amountUnits)

  return {
    totalCostUsd,
    totalSelectedTokenValueUnits,
    totalSelectedNativeTokenValueUnits,
  }
}

export const useIsTransactionValid = (): boolean => {
  const { toAddress, amountInCrypto } = useFormSnapshot()
  const {
    selectedToken,
    selectedTokenBalance,
    selectedNativeToken,
    selectedNativeTokenBalance,
  } = useSelectedTokens()
  const gasCosts = useGasCosts()
  const amountLimits = useAmountLimits()

  if (
    !toAddress ||
    !amountInCrypto ||
    !selectedToken ||
    !selectedTokenBalance ||
    !selectedNativeToken ||
    !selectedNativeTokenBalance ||
    !gasCosts ||
    !amountLimits
  ) {
    console.debug("Transaction is not valid: undefined inputs")
    return false
  }

  if (isValidEvmAddress(toAddress, selectedToken.chainId) === false) {
    console.debug("Transaction is not valid: `to` is not a valid address")
    return false
  }

  if (gasCosts.isOutOfGas) {
    console.debug("Transaction is not valid: out of gas")
    return false
  }

  if (!isAmountSafe(amountInCrypto)) {
    console.debug("Transaction is not valid: amount is not safe")
    return false
  }

  const isAmountZero = parseAmount(amountInCrypto).isZero()
  if (isAmountZero) {
    console.debug("Transaction is not valid: amount is zero")
    return false
  }

  const isAmountExceedingMax = parseAmount(amountInCrypto).gt(
    parseAmount(amountLimits.maxAmount),
  )
  if (isAmountExceedingMax) {
    console.debug("Transaction is not valid: amount is exceeding max amount")
    return false
  }

  const isAmountExceedingMin = parseAmount(amountInCrypto).lt(
    parseAmount(amountLimits.minAmount),
  )
  if (isAmountExceedingMin) {
    console.debug("Transaction is not valid: amount is exceeding min amount")
    return false
  }

  return true
}

export const useSubmitTransaction = () => {
  const { signer } = useSessionContext()

  const { selectedToken, selectedNativeToken } = useSelectedTokens()
  const { amountInCrypto } = useFormSnapshot()

  const { data: broadcastRequest } = useBroadcastRequest()
  const { data: broadcastOptions } = useBroadcastOptions()
  const { data: gasLimit } = useGasLimit()
  const { addPropagatingTx } = useSnapshot(activityHistoryStore)

  const isTransactionValid = useIsTransactionValid()

  return useCallback(async () => {
    if (isTransactionValid !== true) {
      throw new Error(`Cannot send transaction: transaction is not valid`)
    }

    if (
      !amountInCrypto ||
      !signer ||
      !selectedToken ||
      !broadcastRequest ||
      !broadcastOptions ||
      gasLimit === undefined
    ) {
      throw new Error(`Cannot send transaction: missing data`)
    }

    const { address, chainId } = selectedToken
    return sendTx(
      signer.EVM,
      gasLimit,
      broadcastRequest,
      broadcastOptions,
    ).then(async ({ hash, trxMinedPromise }) => {
      addPropagatingTx({
        hash,
        chainId: chainId,
        method: "Sent",
        txDirection: TxDirection.OUTGOING,
        from: signer.EVM.address,
        to: broadcastRequest.to
          ? broadcastRequest.to.toString().toLowerCase()
          : "0x0",
        tokenAddress: address,
        amount: amountInCrypto,
        timestamp: new Date().getTime() / 1000,
      })
      return { hash, trxMinedPromise }
    })
  }, [
    isTransactionValid,
    amountInCrypto,
    signer,
    selectedToken,
    broadcastRequest,
    broadcastOptions,
    gasLimit,
    selectedNativeToken,
    addPropagatingTx,
  ])
}

type UseEstimateTypeAndFeesHook = SWRResponse<BroadcastOptions>
const useEstimateTypeAndFees = (
  chainId: number | undefined,
  options?: SWRConfiguration,
): UseEstimateTypeAndFeesHook =>
  useSWRImmutable(
    chainId ? [chainId, "estimateTypeAndFees"] : null,
    ([chainId]) => estimateTypeAndFees(chainId),
    {
      ...(options ?? {}),
      refreshInterval: 10000,
      keepPreviousData: true,
    },
  )
