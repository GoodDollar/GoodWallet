import { useEffect, useMemo, useState } from "react"
import { formatUnits, parseUnits } from "ethers"
import { Text } from "ui"
import { useSnapshot } from "valtio"

import { getChainProvider } from "@/chain/provider/provider"
import { truncateString } from "@/components/Utils/format"
import {
  formatTokenAmount,
  formatTokenValue,
} from "@/components/Utils/tokenFormat"
import { TxDirection } from "@/hooks/useLedger/types"
import { sessionState } from "@/login/context/SessionContext/storage"
import { useSelectedCurrency } from "@/stores/currencyStore"
import { activityHistoryStore } from "@/stores/transactionHistoryStore"
import { mulWithTokenBalanceUsdPrice } from "@/tokens/utils"
import { useTranslation } from "@/translations"

import { useNetworkFeePerByteSats } from "../../hooks/btcTransaction"
import { useFormSnapshot } from "../../hooks/form"
import { useSelectedTokens } from "../../hooks/transaction"
import style from "../../SendView.module.css"
import type { DetailsProps } from "./types"

export const BTCDialogDetails = ({
  setSubmitTransaction,
  setIsValid,
}: DetailsProps) => {
  const { translations } = useTranslation()
  const sendTranslations = translations.send
  const selectedCurrency = useSelectedCurrency()
  const formSnap = useFormSnapshot()
  const { addPropagatingTx } = useSnapshot(activityHistoryStore)
  const { toAddress, amountInCrypto } = formSnap
  const { selectedToken, selectedTokenBalance } = useSelectedTokens()

  const sessionSnap = useSnapshot(sessionState).session

  const [totalFee, setTotalFee] = useState<number>()

  const feePerByteSats = useNetworkFeePerByteSats()

  const totalFeeNative = useMemo(() => {
    if (totalFee && selectedToken) {
      return formatUnits(Math.ceil(totalFee), selectedToken.decimals)
    }
    return undefined
  }, [totalFee, selectedToken])

  useEffect(() => {
    setIsValid(false)
    if (
      selectedToken &&
      sessionSnap &&
      toAddress &&
      amountInCrypto &&
      feePerByteSats
    ) {
      const chainProvider = getChainProvider(selectedToken.chainId)
      switch (chainProvider.family) {
        case "BTC":
        case "BTC_TESTNET":
        case "DOGE":
        case "DOGE_TESTNET": {
          const signers = sessionSnap.signer
          const signer = signers[chainProvider.family]
          if (!signer) {
            throw new Error("Signer not found")
          }

          const amountSats = parseUnits(amountInCrypto, selectedToken.decimals)
          if (amountSats < chainProvider.DUST_AMOUNT) {
            console.warn(
              `Transaction amount (${amountSats}) is below the dust threshold (${chainProvider.DUST_AMOUNT}). PSBT creation skipped.`,
            )
            return
          }

          chainProvider
            .createSendToPSBT(
              signer.address,
              toAddress,
              amountSats,
              feePerByteSats,
            )
            .then((psbt) => {
              const bytesRequired =
                chainProvider.calculateNetworkFeeBytesRequired(
                  psbt.inputCount,
                  2,
                )
              setTotalFee(bytesRequired * feePerByteSats)

              const signAndBroadcast = () =>
                signer
                  .signPsbt(psbt)
                  .then(chainProvider.broadcastTransaction)
                  .then((txId) =>
                    addPropagatingTx({
                      hash: txId,
                      chainId: selectedToken.chainId,
                      method: "Sent",
                      from: signer.address,
                      to: toAddress,
                      tokenAddress: selectedToken.address,
                      amount: amountInCrypto,
                      timestamp: new Date().getTime() / 1000,
                      txDirection: TxDirection.OUTGOING,
                    }),
                  )
              setSubmitTransaction(signAndBroadcast)
              setIsValid(true)
            })
            .catch((error) => {
              console.error("Failed to create PSBT", error)
            })
          return
        }
        default:
          console.error(
            "Fatal error: unsupported chain type",
            chainProvider.family,
          )
      }
    }
  }, [
    selectedToken,
    sessionSnap,
    toAddress,
    amountInCrypto,
    feePerByteSats,
    setTotalFee,
    setSubmitTransaction,
    setIsValid,
    addPropagatingTx,
  ])

  const amountInUsd = useMemo(
    () =>
      totalFeeNative && selectedTokenBalance
        ? mulWithTokenBalanceUsdPrice(
            totalFeeNative,
            selectedTokenBalance,
          )?.toString()
        : undefined,
    [totalFeeNative, selectedTokenBalance],
  )

  const amountInUsdConverted = useMemo(
    () =>
      amountInUsd ? formatTokenValue(amountInUsd, selectedCurrency) : undefined,
    [amountInUsd, selectedCurrency],
  )

  return (
    <div className={style.sendReviewInfo}>
      <div className={style.sendReviewInfoLine}>
        <Text style="14-600" color="text-secondary" align="left">
          {sendTranslations.to}
        </Text>
        <Text style="14-400" align="right" translate="no">
          {truncateString(toAddress, 8, 8)}
        </Text>
      </div>

      <div className={style.sendReviewInfoLine}>
        <Text style="14-600" color="text-secondary" align="left">
          {"Fee Rate"}
        </Text>
        <Text style="14-400" align="right" translate="no">
          {feePerByteSats ? formatTokenAmount(feePerByteSats, "Sats/B") : "N/A"}
        </Text>
      </div>

      <div className={style.sendReviewInfoLine}>
        <Text style="14-600" color="text-secondary" align="left">
          {"Network Fee"}
        </Text>
        <Text style="14-400" align="right" translate="no">
          {totalFeeNative
            ? formatTokenAmount(totalFeeNative, selectedToken?.symbol ?? "")
            : "N/A"}
          {amountInUsdConverted ? ` (${amountInUsdConverted})` : " N/A"}
        </Text>
      </div>

      <div className={style.sendReviewDisclaimer}>
        <Text
          className="pt-2"
          style="12-400"
          color="text-secondary"
          align="center"
        >
          {sendTranslations.sendDisclaimer}
        </Text>
      </div>
    </div>
  )
}
