import { useEffect, useMemo } from "react"
import { Text } from "ui"

import { truncateString } from "@/components/Utils/format"
import {
  formatTokenAmount,
  formatTokenValue,
} from "@/components/Utils/tokenFormat"
import { formatUnits, parseAmount } from "@/ethers-utils"
import { useSelectedCurrency } from "@/stores/currencyStore"
import { mulWithTokenBalanceUsdPrice } from "@/tokens/utils"
import { useTranslation } from "@/translations"

import {
  useBroadcastOptions,
  useGasCosts,
  useIsTransactionValid,
  useSubmitTransaction,
  useTotalCosts,
} from "../../hooks/evmTransaction"
import { useFormSnapshot } from "../../hooks/form"
import { useSelectedTokens } from "../../hooks/transaction"
import style from "../../SendView.module.css"
import type { DetailsProps } from "./types"

export const EVMDialogDetails = ({
  setSubmitTransaction,
  setIsValid,
}: DetailsProps) => {
  const gasCosts = useGasCosts()
  const totalCosts = useTotalCosts()

  const { translations } = useTranslation()
  const sendTranslations = translations.send
  const selectedCurrency = useSelectedCurrency()

  const useFormSnap = useFormSnapshot()
  const { toAddress, amountInCrypto, toEns } = useFormSnap

  const submitTransaction = useSubmitTransaction()
  const isTransactionValid = useIsTransactionValid()

  useEffect(() => {
    setIsValid(isTransactionValid)
  }, [setIsValid, isTransactionValid])

  const {
    selectedNativeTokenBalance,
    selectedToken,
    selectedNativeToken,
    isSelectedTokenERC20,
  } = useSelectedTokens()

  const { data: broadcastOptions } = useBroadcastOptions()

  useEffect(() => {
    setSubmitTransaction(handleSubmitTransaction)
  }, [submitTransaction, setSubmitTransaction])

  const handleSubmitTransaction = async () => {
    const { trxMinedPromise } = await submitTransaction()
    await trxMinedPromise
  }

  const maxGasFee = useMemo(() => {
    if (!gasCosts || !selectedNativeTokenBalance || !selectedNativeToken)
      return "N/A"
    const maxGasCostUsd = mulWithTokenBalanceUsdPrice(
      parseAmount(gasCosts?.maxGasCost, selectedNativeToken.decimals),
      selectedNativeTokenBalance,
    )?.toString()

    const formattedGasAmount = formatUnits(
      gasCosts.maxGasCost,
      selectedNativeToken.decimals,
    )

    return maxGasCostUsd !== undefined
      ? `${formatTokenAmount(formattedGasAmount, selectedNativeToken.symbol)} (${formatTokenValue(maxGasCostUsd, selectedCurrency)}) `
      : "N/A"
  }, [
    gasCosts,
    selectedNativeTokenBalance,
    selectedNativeToken,
    selectedCurrency,
  ])

  const maxFeePerGas = formatTokenAmount(
    parseAmount(
      broadcastOptions?.type === 0
        ? broadcastOptions.gasPrice
        : (broadcastOptions?.maxFeePerGas ?? 0),
      9,
    ).toString(),
    "GWEI",
  )

  const totalCost = (
    <>
      {formatTokenAmount(
        parseAmount(
          totalCosts?.totalSelectedNativeTokenValueUnits ?? 0,
          selectedNativeToken?.decimals,
        ).toString(),
        selectedNativeToken?.symbol ?? "",
      )}
      {isSelectedTokenERC20 &&
        ` + ${formatTokenAmount(amountInCrypto ?? 0, selectedToken?.symbol ?? "")}`}
      {totalCosts?.totalCostUsd &&
        ` (${formatTokenValue(totalCosts.totalCostUsd, selectedCurrency)}) `}
    </>
  )

  return (
    <div>
      <div className={style.sendReviewInfo}>
        <div className={style.sendReviewInfoLine}>
          <Text style="14-600" color="text-secondary" align="left">
            {sendTranslations.to}
          </Text>
          <Text style="14-400" align="right" color="white" translate="no">
            {toEns
              ? `(${toEns}) ${truncateString(toAddress, 6, 6)}`
              : truncateString(toAddress, 8, 8)}
          </Text>
        </div>

        <div className={style.sendReviewInfoLine}>
          <Text style="14-600" color="text-secondary" align="left">
            {sendTranslations.maxGasFee}
          </Text>
          <Text style="14-400" align="right" color="white" translate="no">
            {maxGasFee}
          </Text>
        </div>

        <div className={style.sendReviewInfoLine}>
          <Text style="14-600" color="text-secondary" align="left">
            {sendTranslations.maxFeePerGas}
          </Text>
          <Text style="14-400" align="right" color="white" translate="no">
            {maxFeePerGas}
          </Text>
        </div>

        <div className={style.sendReviewInfoLine}>
          <Text style="14-600" color="text-secondary" align="left">
            {sendTranslations.totalCost}
          </Text>
          <Text style="14-400" align="right" color="white" translate="no">
            {totalCost}
          </Text>
        </div>
      </div>

      <div className={style.sendReviewDisclaimer}>
        {isTransactionValid ? (
          <Text
            className="pt-2"
            style="12-400"
            color="text-secondary"
            align="center"
          >
            {sendTranslations.sendDisclaimer}
          </Text>
        ) : (
          <Text style="12-400" color="error" align="center">
            {sendTranslations.insufficientResourcesForNetworkCost(
              selectedNativeToken?.symbol ?? "",
              true,
            )}
          </Text>
        )}
      </div>
    </div>
  )
}
