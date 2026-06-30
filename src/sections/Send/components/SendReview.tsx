"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button, createToast, updateToast } from "ui"

import { AnalyticsEventTypes } from "@/analytics/types"
import { captureEvent } from "@/analytics/useAnalytics"
import { getChainProvider } from "@/chain/provider/provider"
import {
  BITCOIN_FAMILY,
  BITCOIN_TESTNET_FAMILY,
  DOGE_FAMILY,
  DOGE_TESTNET_FAMILY,
  EVM_FAMILY,
  SOLANA_DEVNET_FAMILY,
  SOLANA_FAMILY,
  XRP_FAMILY,
  XRP_TESTNET_FAMILY,
} from "@/chain/types"
import { formatTokenAmount } from "@/components/Utils/tokenFormat"
import { useRouteTransition } from "@/hooks/useRouteTransition"
import { useTokenBalances } from "@/hooks/useTokenBalances"
import { useSelectedCurrency } from "@/stores/currencyStore"
import { useTranslation } from "@/translations"

import { SendAmount } from "../components/SendAmount"
import {
  openSendDialog,
  SendConfirmDialog,
} from "../components/SendConfirmDialog/SendConfirmDialog"
import { resetFormData, useFormSnapshot } from "../hooks/form"
import { useSelectedTokens } from "../hooks/transaction"
import { BTCDialogDetails } from "./SendConfirmDialog/BTCDialogDetails"
import { EVMDialogDetails } from "./SendConfirmDialog/EVMDialogDetails"
import { SVMDialogDetails } from "./SendConfirmDialog/SVMDialogDetails"
import { XRPDialogDetails } from "./SendConfirmDialog/XRPDialogDetails"

export function SendReview() {
  const { translations, locale } = useTranslation()
  const sendTranslations = translations.send

  const gotoHome = useRouteTransition(`/${locale}`)

  const useFormSnap = useFormSnapshot()
  const { amountInCrypto, amountInSelectedCurrency, toAddress, show } =
    useFormSnap

  const selectedCurrency = useSelectedCurrency()

  const { mutateBalancesForChain } = useTokenBalances()

  const { selectedToken } = useSelectedTokens()

  const [isSending, setIsSending] = useState(false)
  const [isValid, setIsValid] = useState(false)

  //TODO : Refactor later, this is a bit ugly but made like this to avoid changing EVM handling too much
  const submitTransaction = useRef<() => Promise<unknown>>(async () => {})
  const setSubmitTransaction = useCallback((fn: () => Promise<unknown>) => {
    submitTransaction.current = fn
  }, [])

  useEffect(() => {
    setIsValid(false)
  }, [selectedToken])

  const handleConfirm = async () => {
    if (
      !amountInCrypto ||
      !selectedToken ||
      (show === "selectedCurrency" && !amountInSelectedCurrency)
    ) {
      throw new Error("Amount or selectedToken is missing")
    }

    const status = await openSendDialog()
    if (status !== "accepted") return null

    const formattedAmount = formatTokenAmount(
      amountInCrypto,
      selectedToken.symbol,
    )
    const toastId = createToast({
      message: `${sendTranslations.sending} ${formattedAmount}`,
      status: "pending",
    })
    setIsSending(true)
    submitTransaction
      .current()
      .then(() => {
        const tokenAmount = Number(amountInCrypto)
        const usdAmount =
          Number(amountInSelectedCurrency) * selectedCurrency.usdExchangeRate

        captureEvent({
          type: AnalyticsEventTypes.SendSucceeded,
          chainId: selectedToken.chainId,
          symbol: selectedToken.symbol,
          tokenAddress: selectedToken.address,
          amount: tokenAmount,
          usdAmount: usdAmount ?? 0,
        })
        updateToast({
          id: toastId,
          message: `${sendTranslations.sendSuccess} ${formattedAmount}`,
          status: "success",
          autoClose: true,
        })

        mutateBalancesForChain(selectedToken.chainId)
        gotoHome()
        resetFormData()
      })
      .catch((error) => {
        captureEvent({
          type: AnalyticsEventTypes.SendFailed,
          chainId: selectedToken.chainId,
          symbol: selectedToken.symbol,
          tokenAddress: selectedToken.address,
          amount: Number(amountInCrypto),
        })

        const msg = `${sendTranslations.sendFailure} ${formattedAmount}`
        updateToast({
          id: toastId,
          message: msg,
          status: "error",
          autoClose: false,
        })
        console.error(msg, error)
      })
      .finally(() => {
        setSubmitTransaction(async () => {})
        setIsSending(false)
      })
  }

  const chainProvider = selectedToken && getChainProvider(selectedToken.chainId)

  const isAddressValid =
    chainProvider && toAddress && chainProvider.isValidAddress(toAddress)
  const isAmountValid = amountInCrypto && Number(amountInCrypto) > 0

  return (
    <>
      <Button
        variant="solid"
        text={sendTranslations.reviewTxBtnLabel}
        full
        disabled={!isAddressValid || !isAmountValid || isSending}
        onClick={handleConfirm}
      />

      {chainProvider && (
        <SendConfirmDialog
          title={sendTranslations.reviewTxBtnLabel}
          acceptBtnLabel={sendTranslations.confirmBtnLabel}
          rejectBtnLabel={sendTranslations.cancelBtnLabel}
          disableAcceptBtn={!isAddressValid || !isAmountValid || !isValid}
          loading={isSending}
        >
          <SendAmount inert={true} />
          {chainProvider.family === EVM_FAMILY ? (
            <EVMDialogDetails
              setSubmitTransaction={setSubmitTransaction}
              setIsValid={setIsValid}
            />
          ) : chainProvider.family === BITCOIN_FAMILY ||
            chainProvider.family === BITCOIN_TESTNET_FAMILY ||
            chainProvider.family === DOGE_FAMILY ||
            chainProvider.family === DOGE_TESTNET_FAMILY ? (
            <BTCDialogDetails
              setSubmitTransaction={setSubmitTransaction}
              setIsValid={setIsValid}
            />
          ) : chainProvider.family === SOLANA_FAMILY ||
            chainProvider.family === SOLANA_DEVNET_FAMILY ? (
            <SVMDialogDetails
              setSubmitTransaction={setSubmitTransaction}
              setIsValid={setIsValid}
            />
          ) : chainProvider.family === XRP_FAMILY ||
            chainProvider.family === XRP_TESTNET_FAMILY ? (
            <XRPDialogDetails
              setSubmitTransaction={setSubmitTransaction}
              setIsValid={setIsValid}
            />
          ) : null}
        </SendConfirmDialog>
      )}
    </>
  )
}
