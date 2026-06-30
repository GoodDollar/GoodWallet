import { useEffect, useMemo, useState } from "react"
import { Text } from "ui"
import { useSnapshot } from "valtio"
import type { Transaction } from "xrpl"
import { dropsToXrp } from "xrpl"
import type { PaymentMetadata } from "xrpl/dist/npm/models/transactions/payment"

import { getChainProvider } from "@/chain/provider/provider"
import type { Fees } from "@/chain/provider/XRP/types"
import { XRP_FAMILY } from "@/chain/types"
import { truncateString } from "@/components/Utils/format"
import { formatTokenAmount } from "@/components/Utils/tokenFormat"
import { TxDirection } from "@/hooks/useLedger/types"
import { sessionState } from "@/login/context/SessionContext/storage"
import { activityHistoryStore } from "@/stores/transactionHistoryStore"
import { useTranslation } from "@/translations"

import { useFormSnapshot } from "../../hooks/form"
import { useSelectedTokens } from "../../hooks/transaction"
import style from "../../SendView.module.css"
import type { DetailsProps } from "./types"

export const XRPDialogDetails = ({
  setSubmitTransaction,
  setIsValid,
}: DetailsProps) => {
  const { translations } = useTranslation()
  const sendTranslations = translations.send
  const sessionSnap = useSnapshot(sessionState).session
  const [baseFeeDrops, setBaseFeeDrops] = useState<number>(0)
  const [loadFactor, setLoadFactor] = useState<number>(0)
  const [totalFee, setTotalFee] = useState<number>(0)
  const formSnap = useFormSnapshot()
  const { selectedToken } = useSelectedTokens()
  const { addPropagatingTx } = useSnapshot(activityHistoryStore)
  const { toAddress, amountInCrypto } = formSnap
  const [trx, setTrx] = useState<Transaction>()
  const [fees, setFees] = useState<Fees>()

  const { signer, chainProvider } = useMemo(() => {
    if (!sessionSnap || !selectedToken) {
      return { signer: null, chainProvider: null }
    }

    const chainProvider = getChainProvider(selectedToken.chainId)
    if (
      chainProvider.family !== "XRP" &&
      chainProvider.family !== "XRP_TESTNET"
    ) {
      return { signer: null, chainProvider: null }
    }

    const signers = sessionSnap.signer
    const signer = signers[chainProvider.family]
    if (!signer) {
      return { signer: null, chainProvider: null }
    }

    return { signer, chainProvider }
  }, [sessionSnap, selectedToken])

  useEffect(() => {
    ;(async () => {
      if (!(chainProvider && signer && toAddress && amountInCrypto)) {
        return
      }

      const fees = await chainProvider.getNetworkFee()
      const trx = await chainProvider.createNativeSendTransaction(
        signer.address,
        toAddress,
        amountInCrypto,
        fees,
      )

      setTrx(trx)
      setFees(fees)
    })()
  }, [sessionSnap, selectedToken, toAddress, amountInCrypto, sessionSnap])

  // update the specific fees
  useEffect(() => {
    if (fees && trx) {
      setBaseFeeDrops(fees.baseFee)
      setLoadFactor(fees.loadFactor)
      setTotalFee(dropsToXrp(Number(trx.Fee)))
    }
  }, [fees, trx])

  useEffect(() => {
    setIsValid(false)
    if (
      !selectedToken ||
      !signer ||
      !trx ||
      !chainProvider ||
      !toAddress ||
      !amountInCrypto
    ) {
      return
    }

    const submitTransactionCallback = async () => {
      const signed = await signer.sign(trx)
      const res = await chainProvider.broadcastTransaction(signed)

      const meta = res.result.meta
      if (
        typeof meta !== "object" ||
        !meta ||
        (meta as PaymentMetadata).TransactionResult !== "tesSUCCESS"
      ) {
        throw new Error(
          `Transaction not successful: ${(meta as PaymentMetadata).TransactionResult}`,
        )
      }

      addPropagatingTx({
        hash: signed.hash,
        chainId: selectedToken.chainId,
        method: "Sent",
        from: signer.address,
        to: toAddress,
        tokenAddress: selectedToken.address,
        amount: amountInCrypto,
        timestamp: Date.now() / 1000,
        txDirection: TxDirection.OUTGOING,
      })
    }

    setIsValid(true)
    setSubmitTransaction(submitTransactionCallback)
  }, [selectedToken, signer, trx, chainProvider, toAddress, amountInCrypto])

  const baseFeeFormatted = useMemo(() => {
    if (!baseFeeDrops) {
      return undefined
    }
    return formatTokenAmount(baseFeeDrops, XRP_FAMILY)
  }, [baseFeeDrops])

  const totalFeeFormatted = useMemo(() => {
    if (!totalFee) {
      return undefined
    }
    return formatTokenAmount(totalFee, XRP_FAMILY)
  }, [totalFee])

  return (
    <div className={style.sendReviewInfo}>
      <div className={style.sendReviewInfoLine}>
        <Text style="14-600" color="--color-grey" align="left">
          {sendTranslations.to}
        </Text>
        <Text style="14-400" align="right">
          {truncateString(toAddress, 8, 8)}
        </Text>
      </div>

      <div className={style.sendReviewInfoLine}>
        <Text style="14-600" color="--color-grey" align="left">
          {"Base Fee XRP"}
        </Text>
        <Text style="14-400" align="right">
          {baseFeeFormatted ?? "Calculating..."}
        </Text>
      </div>
      <div className={style.sendReviewInfoLine}>
        <Text style="14-600" color="--color-grey" align="left">
          {"Load factor"}
        </Text>
        <Text style="14-400" align="right">
          {loadFactor ?? "Calculating..."}
        </Text>
      </div>
      <div className={style.sendReviewInfoLine}>
        <Text style="14-600" color="--color-grey" align="left">
          {"Total fee"}
        </Text>
        <Text style="14-400" align="right">
          {totalFeeFormatted ?? "Calculating..."}
        </Text>
      </div>
    </div>
  )
}
