import { Contract } from "ethers"
import { MulticallWrapper } from "ethers-multicall-provider"
import { proxy } from "valtio"

import { CELO_CHAIN_ID, XDC_CHAIN_ID } from "@/chain/chain-ids"
import { config } from "@/config"
import {
  type BroadcastRequest,
  encodeMethodCall,
  getEthersProvider,
} from "@/ethers-utils"
import type { INVITEABLE_CHAIN_ID } from "@/gooddollar/stores/inviteCodeStore"

import OneTimeReward from "../abi/OneTimeReward.min.json"
import { configureContracts } from "../config"
import { getG$ContractAddress } from "../contracts/pool"
import { formatG$ } from "../utils"
import { getTx } from "./utils"

type OneTimeReward =
  | {
      status: "idle"
    }
  | {
      status: "error"
      error: string
    }
  | {
      status: "is_active"
      rewardAmount: number
    }
  | {
      status: "can_claim"
      rewardAmount: number
      gasLimit: bigint
      claimRequest: BroadcastRequest
    }
  | {
      status: "has_claimed"
      rewardAmount: number
    }

configureContracts(config.g$claim.contracts)
export const oneTimeRewardStore = proxy<
  Record<INVITEABLE_CHAIN_ID, OneTimeReward>
>({
  [CELO_CHAIN_ID]: {
    status: "idle",
  },
  [XDC_CHAIN_ID]: {
    status: "idle",
  },
})

const actions = {
  setError: (chainId: INVITEABLE_CHAIN_ID, error: string) => {
    oneTimeRewardStore[chainId].status = "error" as const
    if (oneTimeRewardStore[chainId].status === "error") {
      oneTimeRewardStore[chainId].error = error
    }
  },
  setSkipped: (chainId: INVITEABLE_CHAIN_ID) => {
    oneTimeRewardStore[chainId].status = "idle"
  },
  setIsActive: (chainId: INVITEABLE_CHAIN_ID, rewardAmount: number) => {
    oneTimeRewardStore[chainId].status = "is_active"
    if (oneTimeRewardStore[chainId].status === "is_active") {
      oneTimeRewardStore[chainId].rewardAmount = rewardAmount
    }
  },
  setCanClaim: (
    chainId: INVITEABLE_CHAIN_ID,
    rewardAmount: number,
    gasLimit: bigint,
    broadCastRequest: BroadcastRequest,
  ) => {
    oneTimeRewardStore[chainId].status = "can_claim"
    if (oneTimeRewardStore[chainId].status === "can_claim") {
      oneTimeRewardStore[chainId].rewardAmount = rewardAmount
      oneTimeRewardStore[chainId].gasLimit = gasLimit
      oneTimeRewardStore[chainId].claimRequest = broadCastRequest
    }
  },
  setHasClaimed: (chainId: INVITEABLE_CHAIN_ID, rewardAmount: number) => {
    oneTimeRewardStore[chainId].status = "has_claimed"
    if (oneTimeRewardStore[chainId].status === "has_claimed") {
      oneTimeRewardStore[chainId].rewardAmount = rewardAmount
    }
  },
}

export const refresh = async (
  chainId: INVITEABLE_CHAIN_ID,
  address: string | undefined,
) => {
  try {
    const provider = MulticallWrapper.wrap(getEthersProvider(chainId))
    const contractAddress = getG$ContractAddress(chainId, "OneTimeReward")
    const contract = new Contract(contractAddress, OneTimeReward.abi, provider)

    const [active, rewardAmount, hasClaimed, canClaim] = await Promise.all([
      contract.activeAndBalance() as Promise<boolean>,
      contract.rewardAmount() as Promise<bigint>,
      address ? (contract.claimed(address) as Promise<boolean>) : null,
      address
        ? (contract.checkCanClaimReward(address) as Promise<boolean>)
        : null,
    ])

    const rewardAmountNumber = Number(formatG$(rewardAmount, chainId))

    if (!active || rewardAmountNumber <= 0) {
      actions.setError(chainId, "OneTimeReward contract is not active")
      return
    }

    if (!address) {
      actions.setIsActive(chainId, rewardAmountNumber)
      return
    }

    if (hasClaimed) {
      actions.setHasClaimed(chainId, Number(rewardAmount))
      return
    }
    if (canClaim) {
      const callData = await encodeMethodCall(contract, "claimReward", [
        address,
      ])
      const { gasLimit, ...broadcastRequest } = await getTx(
        chainId,
        address,
        callData,
      )
      actions.setCanClaim(
        chainId,
        rewardAmountNumber,
        gasLimit,
        broadcastRequest,
      )
      return
    }
    actions.setError(chainId, "Can't claim reward")
    return
  } catch (e) {
    console.error("OneTimeRewardStore error", e)
    const message = e instanceof Error ? e.message : "Unknown error"
    actions.setError(chainId, message)
  }
}
