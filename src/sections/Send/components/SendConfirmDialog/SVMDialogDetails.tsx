import { useEffect, useMemo, useState } from "react"
import { formatUnits, parseUnits } from "ethers"
import { address, assertIsFullySignedTransaction, lamports } from "gill"
import { Text } from "ui"
import { useSnapshot } from "valtio"

import { getChainProvider } from "@/chain/provider/provider"
import { truncateString } from "@/components/Utils/format"
import {
  formatTokenAmount,
  formatTokenValue,
} from "@/components/Utils/tokenFormat"
import { isNativeToken } from "@/ethers-utils"
import { TxDirection } from "@/hooks/useLedger/types"
import { sessionState } from "@/login/context/SessionContext/storage"
import { useSelectedCurrency } from "@/stores/currencyStore"
import { activityHistoryStore } from "@/stores/transactionHistoryStore"
import { mulWithTokenBalanceUsdPrice } from "@/tokens/utils"
import { useTranslation } from "@/translations"

import { useFormSnapshot } from "../../hooks/form"
import { useSolPrioritizationFeeMicroLamports } from "../../hooks/solTransaction"
import { useSelectedTokens } from "../../hooks/transaction"
import style from "../../SendView.module.css"
import type { DetailsProps } from "./types"

export const SVMDialogDetails = ({
  setSubmitTransaction,
  setIsValid,
}: DetailsProps) => {
  const { translations } = useTranslation()
  const sendTranslations = translations.send

  const formSnap = useFormSnapshot()
  const { toAddress, amountInCrypto } = formSnap

  const { selectedToken } = useSelectedTokens()
  const prioritizationFeeMicroLamports = useSolPrioritizationFeeMicroLamports()
  const { addPropagatingTx } = useSnapshot(activityHistoryStore)
  const selectedCurrency = useSelectedCurrency()
  const [totalFee, setTotalFee] = useState("0")

  const sessionSnap = useSnapshot(sessionState).session
  const [baseFeeLamports, setBaseFeeLamports] = useState<bigint>()
  const [computeUnits, setComputeUnits] = useState<bigint>()
  const [ataFeeLamports, setAtaFeeLamports] = useState<bigint>()
  const [refreshCounter, setRefreshCounter] = useState(0)

  useEffect(() => {
    setIsValid(false)
    if (selectedToken && sessionSnap && toAddress && amountInCrypto) {
      const chainProvider = getChainProvider(selectedToken.chainId)

      switch (chainProvider.family) {
        case "SOLANA":
        case "SOLANA_DEVNET": {
          const signers = sessionSnap.signer
          const signer = signers[chainProvider.family]
          if (!signer) {
            throw new Error("Signer not found")
          }

          const createTransaction = async () => {
            const source = address(signer.address)
            const destination = address(toAddress)
            const amountLamports = lamports(
              parseUnits(amountInCrypto, selectedToken.decimals),
            )

            if (isNativeToken(selectedToken.address)) {
              setAtaFeeLamports(BigInt(0))
              return chainProvider.createSendSolTransaction(
                source,
                destination,
                amountLamports,
              )
            }
            const mint = address(selectedToken.address)
            const tokenProgram = chainProvider.getTokenProgramForMint(
              source,
              mint,
            )
            const ataCreationCost = await chainProvider.getAtaCreationCost(
              destination,
              mint,
              tokenProgram,
            )
            setAtaFeeLamports(ataCreationCost)
            return chainProvider.createSendSplTransaction(
              source,
              destination,
              mint,
              tokenProgram,
              amountLamports,
            )
          }

          //Solana transactions has to be submitted within ~90seconds of their creation (as they refer a blockhash), so we need to ensure its freshness
          const timeout = setTimeout(() => {
            setBaseFeeLamports(undefined)
            setComputeUnits(undefined)
            setAtaFeeLamports(undefined)
            setIsValid(false)
            setRefreshCounter((prev) => prev + 1)
          }, 60_000)

          createTransaction().then(async (tx) => {
            const baseFeeLamports = await chainProvider.getBaseFee(tx)
            setBaseFeeLamports(baseFeeLamports)

            const computeUnits = await chainProvider.getComputeUnits(tx)
            setComputeUnits(computeUnits)

            const signAndBroadcastTransaction = async () => {
              const [signatures] = await signer.signTransactions([tx])
              const signedTx = Object.freeze({
                ...tx,
                signatures,
              })
              assertIsFullySignedTransaction(signedTx)
              const signature =
                await chainProvider.broadcastTransaction(signedTx)

              addPropagatingTx({
                hash: signature,
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
            setSubmitTransaction(signAndBroadcastTransaction)
          })
          return () => clearTimeout(timeout)
        }
        default:
          console.error(
            "Fatal error: unsupported chain type",
            chainProvider.family,
          )
      }
    }
  }, [
    refreshCounter,
    selectedToken,
    sessionSnap,
    toAddress,
    amountInCrypto,
    setBaseFeeLamports,
    setSubmitTransaction,
    setIsValid,
  ])

  const totalFeeSolFormatted = useMemo(() => {
    if (baseFeeLamports === undefined) {
      return undefined
    }
    let totalFeeLamports = baseFeeLamports + (ataFeeLamports || BigInt(0))
    if (prioritizationFeeMicroLamports && computeUnits) {
      totalFeeLamports +=
        (prioritizationFeeMicroLamports * computeUnits) / BigInt(1_000_000)
    }
    setTotalFee(formatUnits(totalFeeLamports, 9))
    return formatTokenAmount(formatUnits(totalFeeLamports, 9), "SOL")
  }, [
    computeUnits,
    ataFeeLamports,
    baseFeeLamports,
    prioritizationFeeMicroLamports,
  ])

  const baseFeeFormatted = useMemo(() => {
    if (!baseFeeLamports) {
      return undefined
    }
    return formatTokenAmount(baseFeeLamports.toString(), "Lamports")
  }, [baseFeeLamports])

  const prioritizationFeeFormatted = useMemo(() => {
    if (
      prioritizationFeeMicroLamports === undefined ||
      computeUnits === undefined
    ) {
      return undefined
    }
    const prioritizationLamports =
      (prioritizationFeeMicroLamports * computeUnits) / BigInt(1_000_000)
    return formatTokenAmount(prioritizationLamports.toString(), "Lamports")
  }, [computeUnits, prioritizationFeeMicroLamports])

  const ataFeeFormatted = useMemo(() => {
    if (ataFeeLamports === undefined) {
      return undefined
    }
    return formatTokenAmount(ataFeeLamports.toString(), "Lamports")
  }, [ataFeeLamports])

  const { selectedTokenBalance } = useSelectedTokens()

  const amountInUsd = useMemo(
    () =>
      totalFee && selectedTokenBalance
        ? mulWithTokenBalanceUsdPrice(
            totalFee,
            selectedTokenBalance,
          )?.toString()
        : undefined,
    [totalFee, selectedTokenBalance],
  )

  const amountInUSDConverted = useMemo(
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
        <Text style="14-400" align="right">
          {truncateString(toAddress, 8, 8)}
        </Text>
      </div>

      <div className={style.sendReviewInfoLine}>
        <Text style="14-600" color="text-secondary" align="left">
          {"Base Fee"}
        </Text>
        <Text style="14-400" align="right">
          {baseFeeFormatted ?? "Calculating..."}
        </Text>
      </div>
      <div className={style.sendReviewInfoLine}>
        <Text style="14-600" color="text-secondary" align="left">
          {"Prioritization Fee"}
        </Text>
        <Text style="14-400" align="right">
          {prioritizationFeeFormatted ?? "Calculating..."}
        </Text>
      </div>
      {ataFeeLamports ? (
        <div className={style.sendReviewInfoLine}>
          <Text style="14-600" color="text-secondary" align="left">
            {"ATA Creation Fee"}
          </Text>
          <Text style="14-400" align="right">
            {ataFeeFormatted ?? "Calculating..."}
          </Text>
        </div>
      ) : null}

      <div className={style.sendReviewInfoLine}>
        <Text style="14-600" color="text-secondary" align="left">
          {"Total Fee"}
        </Text>
        <Text style="14-400" align="right">
          {`${totalFeeSolFormatted ?? "Calculating..."} ${amountInUSDConverted ? `(${amountInUSDConverted})` : ""}`}
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
