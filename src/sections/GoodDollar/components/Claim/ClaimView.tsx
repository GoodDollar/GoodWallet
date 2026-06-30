"use client"

import { useCallback, useEffect, useMemo } from "react"
import { formatUnits, parseUnits } from "ethers"
import useSWRImmutable from "swr/immutable"
import { openDialog, useToast } from "ui"
import { useSnapshot } from "valtio"

import {
  type BroadcastOptions,
  type BroadcastRequest,
  type BroadcastResult,
  estimateTypeAndFees,
  sendTxWaitForMining,
} from "ethers-utils"
import { generateGoodIDLink, syncWhitelist } from "gooddollar"
import { getG$ContractAddress } from "gooddollar/contracts/pool"
import { useTranslation } from "translations"
import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"
import { CELO_CHAIN_ID } from "@/chain/chain-ids"
import { getChainName } from "@/chain/chains"
import { setBottomSheetProps } from "@/components/Snippet/BottomSheet/bottomSheetStore"
import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import { formatTokenAmount } from "@/components/Utils/tokenFormat"
import { topWallet } from "@/gooddollar/methods/faucet"
import { collectBountyStore } from "@/gooddollar/stores/collectBountyStore"
import {
  identityStore,
  refreshIdentityStore,
} from "@/gooddollar/stores/identityStore"
import { refreshInviteStore } from "@/gooddollar/stores/inviteStore"
import {
  oneTimeRewardStore,
  refresh as refreshOneTimeRewardStore,
} from "@/gooddollar/stores/oneTimeRewardStore"
import {
  claimUBIStore,
  refreshUbiStore,
  type UbiClaim,
} from "@/gooddollar/stores/ubiStore"
import { type ChainId, GOODDOLLAR_NETS } from "@/gooddollar/types"
import { useInvitedChainId } from "@/hooks/useInvitedChainId"
import { TxDirection } from "@/hooks/useLedger/types"
import { useRouteTransition } from "@/hooks/useRouteTransition"
import { useTokenBalances } from "@/hooks/useTokenBalances"
import { useSessionContext } from "@/login"
import { activityHistoryStore } from "@/stores/transactionHistoryStore"
import { postMessageToReactNative } from "@/utils/messageReactNative"
import { isEligibleForWelcomeReward } from "@/utils/welcomeRewardEligibility"

import styles from "./Claim.module.css"
import { ClaimButton } from "./ClaimButton"
import { Claimed } from "./Claimed"
import { ClaimFooter } from "./ClaimFooter"
import { ReadyToClaim } from "./ReadyToClaim"
import { RequireWhitelist } from "./RequireWhitelist"

// formatOptions removed - using formatTokenAmount from newFormat instead

type EligibleClaim = {
  chainId: ChainId
  amount: number
  gasLimit: bigint
  claim: () => Promise<BroadcastResult>
} & (
  | {
      type: "ubi"
      nextClaimDate: Date
    }
  | {
      type: "welcome" | "invite" | "invite_join"
    }
)
const TYPE_TO_METHOD_MAP: Record<EligibleClaim["type"], string> = {
  ubi: "Claimed",
  welcome: "Welcome Reward",
  invite: "Invite Reward",
  invite_join: "Invite Join",
}

export type EligibleClaimWithGas = EligibleClaim & {
  sufficientGas: boolean
}

const getDailyStats = (claims: Record<ChainId, UbiClaim>) => {
  const combinedStats = {
    dailyNumberOfClaimers: 0,
    dailyClaimedAmount: 0,
    dailyTotalAmount: 0,
  }
  for (const chainId of GOODDOLLAR_NETS) {
    const claim = claims[chainId]
    if (claim.status === "idle" || claim.status === "error") {
      continue
    }
    combinedStats.dailyNumberOfClaimers = Math.max(
      combinedStats.dailyNumberOfClaimers,
      claim.dailyClaimers,
    )
    combinedStats.dailyClaimedAmount += claim.dailyClaimedAmount
    combinedStats.dailyTotalAmount += claim.dailyPool
  }
  return combinedStats
}

export default function ClaimView() {
  const invitedChainId = useInvitedChainId()

  const { locale, translations } = useTranslation()
  const goodDollarTranslations = translations.gooddollar
  const { captureEvent } = useAnalytics()
  setBottomSheetProps({ title: goodDollarTranslations.title })

  const { signer, userName, type } = useSessionContext()

  const evmAddress = signer?.EVM.address

  const { createToast, updateToast } = useToast()
  const {
    balances,
    tokens,
    prices,
    mutateBalancesForChain: mutateBalances,
  } = useTokenBalances()

  const claims = useSnapshot(claimUBIStore)
  const identities = useSnapshot(identityStore)
  const collectInviteRewards =
    useSnapshot(collectBountyStore)[invitedChainId].state
  const oneTimeReward = useSnapshot(oneTimeRewardStore)[CELO_CHAIN_ID]

  useEffect(() => {
    const refreshClaimPageStores = () => {
      refreshIdentityStore()
      refreshUbiStore("all")
      refreshInviteStore()
    }
    refreshClaimPageStores()
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshClaimPageStores()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  useEffect(() => {
    if (isEligibleForWelcomeReward() && evmAddress) {
      switch (oneTimeReward.status) {
        case "idle":
        case "is_active":
          refreshOneTimeRewardStore(CELO_CHAIN_ID, evmAddress)
          break
      }
    }
  }, [oneTimeReward.status, evmAddress])

  const { data: broadcastOptions } = useSWRImmutable(
    [GOODDOLLAR_NETS, "gasPrices"],
    async ([chains]) => {
      const chaintoGasPrice = new Map<
        (typeof chains)[number],
        BroadcastOptions
      >()
      await Promise.all(
        chains.map(async (chainId) => {
          const broadcastOption = await estimateTypeAndFees(chainId)
          chaintoGasPrice.set(chainId, broadcastOption)
        }),
      )
      return chaintoGasPrice
    },
    {
      refreshInterval: 30000,
      keepPreviousData: true,
    },
  )

  const submitRequest = useCallback(
    async (chainId: ChainId, gasLimit: bigint, request: BroadcastRequest) => {
      if (!signer?.EVM) {
        throw new Error("No signer provided")
      }
      const broadcastOptionsForChain = broadcastOptions?.get(chainId)
      if (!broadcastOptionsForChain) {
        throw new Error("No broadcast options found")
      }
      return sendTxWaitForMining(
        signer.EVM,
        gasLimit,
        request,
        broadcastOptionsForChain,
        true,
      )
    },
    [signer, broadcastOptions],
  )

  const eligibleClaims = useMemo(() => {
    const eligibleClaims: EligibleClaim[] = []

    for (const chainId of GOODDOLLAR_NETS) {
      const claim = claims[chainId]

      if (claim.status === "can_claim") {
        eligibleClaims.push({
          chainId,
          amount: claim.claimAmount,
          gasLimit: claim.gasLimit,
          claim: async () => {
            const res = await submitRequest(
              chainId,
              claim.gasLimit,
              claim.claimRequest,
            )

            refreshUbiStore(chainId)
            if (res.txReceipt === null) {
              throw new Error("No transaction receipt found for claim")
            }
            return res
          },
          type: "ubi",
          nextClaimDate: new Date(claim.nextClaim),
        })
      }
    }

    if (oneTimeReward.status === "can_claim") {
      eligibleClaims.push({
        chainId: CELO_CHAIN_ID,
        amount: oneTimeReward.rewardAmount,
        gasLimit: oneTimeReward.gasLimit,
        claim: async () => {
          const res = await submitRequest(
            CELO_CHAIN_ID,
            oneTimeReward.gasLimit,
            oneTimeReward.claimRequest,
          )
          refreshInviteStore()
          return res
        },
        type: "welcome",
      })
    }

    if (!collectInviteRewards.isLoading && collectInviteRewards.canCollect) {
      eligibleClaims.push({
        chainId: invitedChainId,
        amount: collectInviteRewards.amount,
        gasLimit: collectInviteRewards.gasLimit,
        claim: async () => {
          const res = await submitRequest(
            invitedChainId,
            collectInviteRewards.gasLimit,
            collectInviteRewards.collectRequest,
          )
          refreshInviteStore()
          refreshOneTimeRewardStore(CELO_CHAIN_ID, evmAddress)
          return res
        },
        type: "invite",
      })
    }
    if (!collectInviteRewards.isLoading && collectInviteRewards.canJoin) {
      eligibleClaims.push({
        chainId: invitedChainId,
        amount: 0,
        gasLimit: collectInviteRewards.gasLimit,
        claim: async () => {
          const res = await submitRequest(
            invitedChainId,
            collectInviteRewards.gasLimit,
            collectInviteRewards.collectRequest,
          )
          refreshInviteStore()
          refreshOneTimeRewardStore(CELO_CHAIN_ID, evmAddress)
          return res
        },
        type: "invite_join",
      })
    }
    return eligibleClaims
  }, [
    evmAddress,
    claims,
    oneTimeReward,
    collectInviteRewards,
    submitRequest,
    invitedChainId,
  ])

  const eligibleClaimsWithGasInfo = useMemo(() => {
    if (!eligibleClaims || !broadcastOptions || !balances || !tokens) {
      return []
    }

    return eligibleClaims.map((claim) => {
      const broadcastOption = broadcastOptions.get(claim.chainId)
      const maxFeePerGas =
        broadcastOption &&
        (broadcastOption.type === 0
          ? broadcastOption.gasPrice
          : broadcastOption.maxFeePerGas)
      let sufficientGas = false
      if (maxFeePerGas) {
        const maxGasCost = claim.gasLimit * maxFeePerGas
        const nativeBalance = balances.byChain.getNativeBy({
          chainId: claim.chainId,
        })
        const nativeToken = tokens.getNativeBy({ chainId: claim.chainId })
        if (nativeBalance && nativeToken) {
          sufficientGas =
            maxGasCost <= parseUnits(nativeBalance.amount, nativeToken.decimals)
        }
      }
      return {
        ...claim,
        sufficientGas,
      }
    })
  }, [balances, tokens, eligibleClaims, broadcastOptions])

  useEffect(() => {
    if (!signer || !broadcastOptions) {
      return
    }

    for (const chainId of GOODDOLLAR_NETS) {
      const broadcastOption = broadcastOptions.get(chainId)
      const whitelist = identities[chainId]
      if (
        whitelist.isLoading ||
        whitelist.isError ||
        !whitelist.isWhitelisted
      ) {
        continue
      }

      if (broadcastOption && type) {
        topWallet(signer.EVM, chainId, broadcastOption, type).then((result) => {
          switch (result) {
            case "topped_via_contract":
            case "topped_via_api":
              mutateBalances(chainId)
              captureEvent({
                type: AnalyticsEventTypes.GoodDollarFaucetSucceeded,
                subType: result,
                chainId,
              })
              break
            case "error":
              captureEvent({
                type: AnalyticsEventTypes.GoodDollarFaucetFailed,
                chainId,
              })
              break
          }
        })
      }
    }
  }, [signer, identities, broadcastOptions, type, captureEvent, mutateBalances])

  // Check and call whitelist sync on page load
  useEffect(() => {
    if (!evmAddress) {
      return
    }

    const nonWhitelisted = Object.values(identities)
      .filter((wl) => !wl.isLoading && !wl.isError)
      .find((wl) => !wl.isWhitelisted)

    const primaryWl = identities[invitedChainId]

    if (
      !primaryWl.isLoading &&
      !primaryWl.isError &&
      primaryWl.isWhitelisted &&
      nonWhitelisted
    ) {
      syncWhitelist(evmAddress).then((wasSynced) => {
        if (wasSynced) {
          refreshIdentityStore()
          captureEvent({
            type: AnalyticsEventTypes.GoodDollarWhitelistSynced,
            address: evmAddress,
          })
        }
      })
    }
  }, [evmAddress, invitedChainId, identities, captureEvent])

  const goHome = useRouteTransition(`/${locale}`)
  const addPropagatingTx = useSnapshot(activityHistoryStore).addPropagatingTx

  const onClaim = () => {
    const ongoingClaims = new Map<ChainId, Promise<void>>()

    eligibleClaimsWithGasInfo
      .filter((claim) => claim.sufficientGas)
      .forEach(async (claim) => {
        const { amount, chainId, type } = claim

        const toastId = createToast({
          message:
            type === "invite_join"
              ? goodDollarTranslations.inviteJoinClaimInitiated(
                  getChainName(chainId),
                )
              : `${goodDollarTranslations.claimInitiated(formatTokenAmount(amount, "G$"), getChainName(chainId))}`,
          status: "pending",
        })

        //If there's another claim on the same chain, wait for it to finish to not issues tx's with duplicate nonces
        while (true) {
          const ongoingClaim = ongoingClaims.get(chainId)
          if (ongoingClaim) {
            await ongoingClaim
          } else {
            break
          }
        }

        const currentClaim = claim
          .claim()
          .then(async ({ txResponse, txReceipt }) => {
            const tokenAddress = getG$ContractAddress(chainId, "GoodDollar")
            const tokenPrice = prices?.get(chainId)?.get(tokenAddress)
            const usdAmount = tokenPrice ? Number(tokenPrice) * amount : 0

            captureEvent({
              type: AnalyticsEventTypes.GoodDollarClaimSucceeded,
              subType: type,
              chainId,
              amount: type === "invite_join" ? 0 : amount,
              usdAmount: type === "invite_join" ? 0 : usdAmount,
            })

            updateToast({
              id: toastId,
              message:
                type === "invite_join"
                  ? goodDollarTranslations.inviteJoinClaimSucceeded(
                      getChainName(chainId),
                    )
                  : `${goodDollarTranslations.claimSucceeded(formatTokenAmount(amount, "G$"), getChainName(chainId))}`,
              status: "success",
              autoClose: true,
            })

            const nativeToken = tokens?.getNativeBy({ chainId })
            const gasUsed = txReceipt && txReceipt.gasUsed * txReceipt.gasPrice
            const gas =
              gasUsed && nativeToken
                ? formatUnits(gasUsed, nativeToken.decimals)
                : undefined

            addPropagatingTx({
              hash: txResponse.hash,
              chainId: chainId,
              method: TYPE_TO_METHOD_MAP[type],
              //The tx-response received, is for the wallet -> contract invocation :
              from: txResponse.to ?? "0x0",
              to: txResponse.from ?? "0x0",
              tokenAddress,
              amount: amount.toString(),
              timestamp: new Date().getTime() / 1000,
              txDirection: TxDirection.INCOMING,
              gas,
            })

            switch (type) {
              case "ubi":
                postMessageToReactNative({
                  type: "GOODDOLLAR_CLAIMED",
                  chainId,
                  amount,
                })
                break
              case "invite_join":
                break
              case "invite":
              case "welcome": {
                const { title, bodyText, acceptBtnText } =
                  type === "welcome"
                    ? goodDollarTranslations.welcomeRewardDialog
                    : goodDollarTranslations.inviteRewardDialog
                openDialog({
                  title,
                  bodyText,
                  acceptBtnText,
                })
                break
              }
            }
            mutateBalances(chainId)
          })
          .catch((e: Error) => {
            captureEvent({
              type: AnalyticsEventTypes.GoodDollarClaimFailed,
              subType: type,
              chainId,
              error: JSON.stringify(e),
            })
            updateToast({
              id: toastId,
              message: `${goodDollarTranslations.claimFailed(getChainName(chainId))}`,
              status: "error",
              autoClose: false,
            })
            console.error(e)
          })
          .finally(() => {
            ongoingClaims.delete(chainId)
          })
        ongoingClaims.set(chainId, currentClaim)
      })
    goHome()
  }

  if (Object.values(identities).every((identity) => identity.isLoading)) {
    return <LoadingSpinner />
  }

  if (Object.values(claims).every((claim) => claim.status === "idle")) {
    return <LoadingSpinner />
  }

  // Show loading spinner if hooks are still loading after the player
  if (!broadcastOptions) {
    return <LoadingSpinner />
  }

  // If not whitelisted on Fuse, then trigger whitelist flow
  const primaryWl = identities[invitedChainId]
  if (!primaryWl.isLoading && !primaryWl.isError && !primaryWl.isWhitelisted) {
    return (
      <RequireWhitelist
        onWhitelist={async () => {
          if (!signer) {
            throw new Error("No signer provided")
          }
          if (!userName) {
            throw new Error("No userName provided")
          }
          const link = await generateGoodIDLink(
            signer.EVM,
            userName,
            invitedChainId,
          )
          window.open(link, "_self")
          captureEvent({
            type: AnalyticsEventTypes.GoodDollarWhiteListTriggered,
          })
        }}
      />
    )
  }

  const okClaims = Object.values(claims).filter(
    (c) => c.status === "can_claim" || c.status === "has_claimed",
  )
  const nextClaimDate =
    okClaims.length > 0 ? new Date(okClaims[0].nextClaim) : undefined

  const hasClaims = eligibleClaimsWithGasInfo.length > 0
  return (
    <div className={styles.claimView}>
      <div className={styles.claimMain}>
        {hasClaims ? (
          <ReadyToClaim claimableAmounts={eligibleClaimsWithGasInfo} />
        ) : (
          <Claimed />
        )}
        <ClaimButton
          hasClaims={hasClaims}
          claimsOutOfGas={
            hasClaims &&
            eligibleClaimsWithGasInfo.filter((claim) => claim.sufficientGas)
              .length === 0
          }
          nextClaimDate={nextClaimDate}
          onClaim={onClaim}
        />
      </div>

      <div className={styles.claimBottom}>
        <ClaimFooter dailyStats={getDailyStats(claims)} />
      </div>
    </div>
  )
}
