"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import type { LiFiStep, Route } from "@lifi/sdk"
import { formatUnits, parseUnits } from "ethers"
import useSWRImmutable from "swr/immutable"
import { Button, createToast, Text, toastStore, updateToast } from "ui"
import { useSnapshot } from "valtio"

import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"
import { CELO_CHAIN_ID } from "@/chain/chain-ids"
import { AVAILABLE_CHAINS } from "@/chain/chains"
import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import { formatTokenAmount } from "@/components/Utils/tokenFormat"
import {
  CELO_ADDRESS,
  getEthersProvider,
  isNativeToken,
  ZERO_ADDRESS,
} from "@/ethers-utils"
import { useTokenBalances } from "@/hooks/useTokenBalances"
import { sessionState } from "@/login/context/SessionContext/storage"
import { lifiChainsStore } from "@/stores/lifiChainsStore"
import { activityHistoryStore } from "@/stores/transactionHistoryStore"
import { useTranslation } from "@/translations/hooks/useTranslation"
import {
  retrieveUserFriendlyError,
  UserFriendlyError,
} from "@/utils/userFriendlyError"

import { lifiState } from "../../lifiStore"
import { getPropagatingTxs } from "../../lifiUtils"
import { clearStore, swapState } from "../../swapStore"
import { OutOfGasWarn } from "../OutOfGasWarn/OutOfGasWarn"
import { RouteBox } from "../RouteBox/RouteBox"
import { ConfirmSwapDialog } from "../SwapDialog/ConfirmSwapDialog"
import { openSwapDialog } from "../SwapDialog/swapDialogStore"
import styles from "./RouteSlider.module.css"

const GAS_LIMIT_MULTIPLIER = BigInt(2) // to account for gas estimation inaccuracies from LiFi

const calculateRequiredGasPerChain = (route: Route) => {
  const requiredGasPerChainId = new Map<number, bigint>()

  for (const step of route.steps) {
    step.estimate.gasCosts?.forEach((gasCost) => {
      const chainId = gasCost.token.chainId
      const gasForChain = requiredGasPerChainId.get(chainId) || BigInt(0)

      //LiFi reports inconsistent numbers for their gas, use the largest approach :
      const gasAmountAlt1 = BigInt(gasCost.amount)
      const gasAmountAlt2 =
        BigInt(gasCost.limit) * GAS_LIMIT_MULTIPLIER * BigInt(gasCost.price)
      const newGasForChain =
        gasForChain +
        (gasAmountAlt1 < gasAmountAlt2 ? gasAmountAlt2 : gasAmountAlt1)
      requiredGasPerChainId.set(chainId, newGasForChain)
    })
    step.estimate.feeCosts?.forEach((feeCost) => {
      if (feeCost.included) {
        return
      }

      const chainId = feeCost.token.chainId
      const gasForChain = requiredGasPerChainId.get(chainId) || BigInt(0)
      const newGasForChain = gasForChain + BigInt(feeCost.amount)
      requiredGasPerChainId.set(chainId, newGasForChain)
    })
  }
  return requiredGasPerChainId
}

//lifi doesn't allow the zero address for addressing CELO
const convertAddress = (chainId: number, tokenAddress: string) => {
  if (chainId === CELO_CHAIN_ID && tokenAddress === ZERO_ADDRESS) {
    return CELO_ADDRESS
  }
  return tokenAddress
}

//LiFi sometimes returns routes with 0 gasCost (represented by the GasCostUSD field) - causing the user to believe it's possible to swap
const gasPredicate = (route: Route) =>
  route.gasCostUSD ? parseFloat(route.gasCostUSD) > 0 : false
//Also we don't support paying gas non-native tokens
const gasTokenPredicate = (step: LiFiStep) =>
  step.estimate.gasCosts?.every((gasCost) =>
    isNativeToken(gasCost.token.address),
  ) ?? false
//As well as paying fees (if not) with non-native tokens
const feeTokenPredicate = (step: LiFiStep) =>
  step.estimate.feeCosts?.every(
    (feeCost) => feeCost.included || isNativeToken(feeCost.token.address),
  ) ?? true

export type RouteSliderProps = {
  overrideToAddress?: string
  confirmButtonText?: string
  handleRedirectAfterSwap: () => void
}

export default function RouteSlider(
  {
    confirmButtonText,
    overrideToAddress,
    handleRedirectAfterSwap,
  }: RouteSliderProps = {
    handleRedirectAfterSwap: () => {},
  },
) {
  const { captureEvent } = useAnalytics()
  const [selectedRoute, setSelectedRoute] = useState<Route>()
  const [isSwapping, setIsSwapping] = useState(false)
  const searchParams = useSearchParams()

  const swapSnap = useSnapshot(swapState)
  const origin = swapSnap.origin
  const target = swapSnap.target
  const fromAmount = swapSnap.fromAmount

  const { translations } = useTranslation()

  const addresses = useSnapshot(sessionState).addresses
  const {
    mutateBalancesForChain: mutateBalances,
    balances,
    tokens,
  } = useTokenBalances()
  const { addPropagatingTx } = useSnapshot(activityHistoryStore)
  // Track only `isInitialized` for re-rendering; the client itself is stored as
  // a valtio ref() so we read it directly off lifiState to keep its mutable
  // typing (snapshots deep-freeze types to readonly).
  const isLifiInitialised = useSnapshot(lifiState).isInitialized
  const lifiClient = isLifiInitialised ? lifiState.client : null
  const {
    data: routes,
    isValidating,
    error,
  } = useSWRImmutable(
    lifiClient &&
      origin &&
      target &&
      addresses &&
      fromAmount > 0 && [
        origin,
        target,
        addresses,
        fromAmount,
        overrideToAddress ?? null,
        "lifi/routes",
      ],
    async ([origin, target, addresses, fromAmount, overrideToAddr]) => {
      if (origin === target) {
        throw new Error(translations.swap.errors.originEqualsTarget)
      }
      if (fromAmount <= 0) {
        throw new Error(translations.swap.errors.invalidAmount)
      }

      // Get chain data from lifiChainsStore
      const supportedChains = await lifiChainsStore.chainsIds

      // Check if origin and target chains are supported
      if (!supportedChains.includes(origin.chainId)) {
        throw new Error(translations.swap.errors.originChainNotSupported)
      }
      if (!supportedChains.includes(target.chainId)) {
        throw new Error(translations.swap.errors.targetChainNotSupported)
      }

      const originChain = AVAILABLE_CHAINS.get(origin.chainId)
      const fromAddress = originChain && addresses.get(originChain.family)
      if (!fromAddress || originChain.family === "DOGE") {
        throw new Error(translations.swap.errors.originChainNotSupported)
      }

      const targetChain = AVAILABLE_CHAINS.get(target.chainId)
      const toAddressFromParams =
        overrideToAddr ?? searchParams.get("toAddress")
      const toAddress = toAddressFromParams
        ? toAddressFromParams
        : targetChain && addresses.get(targetChain.family)

      if (!toAddress) {
        throw new Error(translations.swap.errors.targetChainNotSupported)
      }

      try {
        if (!lifiClient) {
          throw new Error(`LiFi not initialised`)
        }
        const { getRoutes } = await import("@lifi/sdk")
        const { routes } = await getRoutes(lifiClient, {
          fromAmount: fromAmount.toString(),
          fromChainId: origin.chainId,
          fromTokenAddress: convertAddress(origin.chainId, origin.address),
          toChainId: target.chainId,
          toTokenAddress: convertAddress(target.chainId, target.address),
          fromAddress,
          toAddress,
          //TODO : We need to be able to persist, monitor and control the ongoing zaps before enabling these
          options: {
            slippage: 0.05,
            allowDestinationCall: false,
            allowSwitchChain: false,
          },
        })

        return routes.filter(
          (route) =>
            gasPredicate(route) &&
            route.steps.every(
              (step) => gasTokenPredicate(step) && feeTokenPredicate(step),
            ),
        )
      } catch {
        // If there is an error, return an empty array to fallow the UI to show the error message
        return []
      }
    },
    {
      refreshInterval: 120000,
      refreshWhenHidden: false,
      keepPreviousData: false,
    },
  )

  useEffect(() => {
    if (isValidating) {
      return
    }

    // Check if the previously selected route is in the new routes
    const foundExistingRoute = routes?.find(
      (route) => route.id === selectedRoute?.id,
    )
    if (foundExistingRoute) {
      return
    }

    // Set the first route as the default selected
    setSelectedRoute(routes?.[0])
  }, [isValidating, routes, selectedRoute])

  const requiredGasForSelectedRoute = useMemo(() => {
    if (!selectedRoute) {
      return new Map<number, bigint>()
    }
    return calculateRequiredGasPerChain(selectedRoute)
  }, [selectedRoute])

  const hasSufficientGasForSelectedRoute = useMemo(() => {
    if (!selectedRoute) {
      return true
    }
    for (const [chainId, requiredGas] of requiredGasForSelectedRoute) {
      const nativeBalance = balances?.byChain.getNativeBy({ chainId })
      const nativeToken = tokens?.getNativeBy({ chainId })
      if (nativeBalance && nativeToken) {
        const nativeBalanceInWei = parseUnits(
          nativeBalance.amount,
          nativeToken.decimals,
        )

        let requiredAmountForSwap = BigInt(0)
        if (
          selectedRoute?.fromToken.chainId === chainId &&
          isNativeToken(selectedRoute.fromToken.address)
        ) {
          requiredAmountForSwap = BigInt(selectedRoute.fromAmount)
        }
        if (requiredGas + requiredAmountForSwap > nativeBalanceInWei) {
          return false
        }
      } else {
        return false
      }
    }
    return true
  }, [requiredGasForSelectedRoute, tokens, balances, selectedRoute])

  const handleReview = useCallback(async () => {
    if (!selectedRoute) return

    const { title, acceptBtnText, rejectBtnText } = translations.swap.swapDialog
    const dialogStatus = await openSwapDialog({
      title,
      acceptBtnText,
      rejectBtnText,
      route: selectedRoute,
    })

    if (dialogStatus !== "accepted") {
      return
    }
    await executeSelectedRoute(selectedRoute)
  }, [
    selectedRoute,
    translations,
    handleRedirectAfterSwap,
    captureEvent,
    mutateBalances,
    addPropagatingTx,
  ])

  const executeSelectedRoute = async (selectedRoute: Route) => {
    const formattedAmount = formatTokenAmount(
      formatUnits(selectedRoute.fromAmount, selectedRoute.fromToken.decimals),
      selectedRoute.fromToken.symbol,
    )
    const { swapInitiated, swapSucceeded, swapFailed, swapSlow } =
      translations.swap.swapNotification

    const notifId = createToast({
      status: "pending",
      message: swapInitiated(formattedAmount, selectedRoute.toToken.symbol),
    })
    setTimeout(() => {
      if (toastStore[notifId]?.status === "pending") {
        updateToast({
          id: notifId,
          message: swapSlow,
          status: "pending",
          autoClose: true,
        })
      }
    }, 40_000)
    setIsSwapping(true)

    try {
      if (!lifiClient) {
        throw new Error(`LiFi not initialised`)
      }
      const { executeRoute } = await import("@lifi/sdk")
      const routeExtendedPromise = executeRoute(lifiClient, selectedRoute, {
        //This is always called, before signing the transactions
        updateTransactionRequestHook: async (tx) => {
          if (!tx.chainId) {
            return tx
          }

          const family = AVAILABLE_CHAINS.get(tx.chainId)?.family
          if (family !== "EVM") {
            return tx
          }

          if (!tx.gas) {
            return tx
          }

          let usedGasPrice = tx.maxFeePerGas || tx.gasPrice
          if (!usedGasPrice) {
            const { gasPrice, maxFeePerGas } = await getEthersProvider(
              tx.chainId,
            ).getFeeData()
            usedGasPrice = maxFeePerGas ?? gasPrice ?? undefined
          }
          if (!usedGasPrice) {
            return tx
          }

          const requiredBalanceWei =
            tx.gas * usedGasPrice + (tx.value || BigInt(0))
          const nativeToken = tokens?.getNativeBy({ chainId: tx.chainId })
          const nativeBalance = balances?.byChain.getNativeBy({
            chainId: tx.chainId,
          })

          if (!nativeBalance || !nativeToken) {
            throw new Error("Native balance not found")
          }

          const nativeBalanceInWei = parseUnits(
            nativeBalance.amount,
            nativeToken.decimals,
          )

          if (requiredBalanceWei > nativeBalanceInWei) {
            captureEvent({
              type: AnalyticsEventTypes.SwapPrecheckFailed,
              chainId: tx.chainId,
              requiredBalance: requiredBalanceWei.toString(),
              availableBalance: nativeBalanceInWei.toString(),
              txSerialized: JSON.stringify(tx),
            })
            const { gasPrecheckFailed } =
              translations.swap.swapNotification.userFriendlyErrors
            throw new UserFriendlyError(gasPrecheckFailed)
          }
          return tx
        },
        updateRouteHook: (updatedRoute) => {
          // Step-level status is the authoritative signal — checking every
          // action for a txHash would stall on non-transactional actions
          // like CHECK_ALLOWANCE, which complete without one.
          const allStepsDone = updatedRoute.steps.every(
            (step) => step.execution?.status === "DONE",
          )
          if (allStepsDone) {
            clearStore()
            handleRedirectAfterSwap()
          }
        },
        acceptExchangeRateUpdateHook: async ({
          toToken,
          oldToAmount,
          newToAmount,
        }) => {
          const oldAmount = parseUnits(oldToAmount, toToken.decimals)
          const newAmount = parseUnits(newToAmount, toToken.decimals)
          const newAmountThreshold = (oldAmount * BigInt(100)) / BigInt(105)
          console.log(
            "Accept exchange rate update hook",
            toToken,
            oldAmount,
            newAmount,
            newAmountThreshold,
          )
          return newAmount >= newAmountThreshold
        },
      })

      const routeExtended = await routeExtendedPromise
      const allStepsSucceeded = routeExtended.steps.every(
        (step) => step.execution?.status === "DONE",
      )

      if (allStepsSucceeded) {
        const propagatingTxs = getPropagatingTxs(routeExtended)
        for (const tx of propagatingTxs) {
          addPropagatingTx(tx)
        }

        captureEvent({
          type: AnalyticsEventTypes.SwapSucceeded,
          fromChainId: selectedRoute.fromChainId,
          toChainId: selectedRoute.toChainId,
          fromTokenSymbol: selectedRoute.fromToken.symbol,
          toTokenSymbol: selectedRoute.toToken.symbol,
          amount: formattedAmount,
          usdAmount: Number(selectedRoute.fromAmountUSD),
        })
        mutateBalances(selectedRoute.fromChainId)
        mutateBalances(selectedRoute.toChainId)
        clearStore()

        updateToast({
          id: notifId,
          autoClose: true,
          message: swapSucceeded(formattedAmount, selectedRoute.toToken.symbol),
          status: "success",
        })

        handleRedirectAfterSwap()
      } else {
        throw new Error("Not all steps succeeded!")
      }
    } catch (error) {
      const userFriendlyError = retrieveUserFriendlyError(error)

      console.error("Error while executing route", selectedRoute.id, error)
      const message =
        userFriendlyError?.message ??
        swapFailed(formattedAmount, selectedRoute.toToken.symbol)
      updateToast({
        id: notifId,
        autoClose: true,
        message,
        status: "error",
      })

      //UserFriendlyErrors marked as handled are not reported as failures in analytics
      if (userFriendlyError) {
        return
      }

      captureEvent({
        type: AnalyticsEventTypes.SwapFailed,
        fromChainId: selectedRoute.fromChainId,
        toChainId: selectedRoute.toChainId,
        fromTokenSymbol: selectedRoute.fromToken.symbol,
        toTokenSymbol: selectedRoute.toToken.symbol,
        amount: formattedAmount,
        reason:
          error instanceof Error
            ? `${error.name} : ${error.message} `
            : String(error),
      })
    } finally {
      setIsSwapping(false)
    }
  }

  return (
    <>
      <ConfirmSwapDialog />
      {routes === undefined ? null : (
        <div className={styles.routeSliderHeader}>
          <Text style="14-600" align="left">
            {isValidating
              ? translations.swap.routesSearchingTag
              : routes.length > 0
                ? translations.swap.routesSelectRouteTag
                : translations.swap.routesNoRoutesTag}
          </Text>
        </div>
      )}
      {error instanceof Error ? (
        <Text style="14-600" align="center" color="error">
          {error.message}
        </Text>
      ) : null}
      {isValidating ? <LoadingSpinner /> : null}
      {routes && routes.length > 0 ? (
        <div className={styles.routeSlider}>
          {routes.map((route) => (
            <RouteBox
              key={route.id}
              route={route}
              routeSelected={selectedRoute?.id === route.id}
              setSelectedRoute={setSelectedRoute}
            />
          ))}
        </div>
      ) : null}
      {!hasSufficientGasForSelectedRoute ? (
        <OutOfGasWarn
          requiredGasForSelectedRoute={requiredGasForSelectedRoute}
        />
      ) : null}
      <Button
        variant="solid"
        full
        loading={isSwapping}
        disabled={
          isValidating ||
          !selectedRoute?.id ||
          !hasSufficientGasForSelectedRoute
        }
        text={confirmButtonText ?? translations.swap.routesReviewBtn}
        onClick={handleReview}
      />
    </>
  )
}
