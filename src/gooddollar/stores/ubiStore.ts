import UBIScheme from "@gooddollar/goodprotocol/artifacts/abis/UBIScheme.min.json"
import { Contract } from "ethers"
import { MulticallWrapper } from "ethers-multicall-provider"
import { proxy, subscribe } from "valtio"
import { subscribeKey } from "valtio/utils"

import { CELO_CHAIN_ID, FUSE_CHAIN_ID, XDC_CHAIN_ID } from "@/chain/chain-ids"
import { config } from "@/config"
import {
  type BroadcastRequest,
  encodeMethodCall,
  getEthersProvider,
} from "@/ethers-utils"
import { sessionState } from "@/login/context/SessionContext/storage"

import { configureContracts } from "../config"
import { getG$ContractAddress } from "../contracts/pool"
import { type ChainId, GOODDOLLAR_NETS } from "../types"
import { formatG$ } from "../utils"
import { identityStore } from "./identityStore"
import { getTx } from "./utils"

const DAY_IN_MS = 1000 * 60 * 60 * 24

type UbiStats = {
  dailyClaimers: number
  dailyClaimedAmount: number
  dailyPool: number
}

export type UbiClaim =
  | {
      status: "idle"
    }
  | {
      status: "error"
      error: string
    }
  | ({
      status: "can_claim"
      claimAmount: number
      gasLimit: bigint
      claimRequest: BroadcastRequest
      nextClaim: number
    } & UbiStats)
  | ({
      status: "has_claimed"
      claimAmount: number
      nextClaim: number
    } & UbiStats)

configureContracts(config.g$claim.contracts)
export const claimUBIStore = proxy<Record<ChainId, UbiClaim>>({
  [FUSE_CHAIN_ID]: {
    status: "idle",
  },
  [CELO_CHAIN_ID]: {
    status: "idle",
  },
  [XDC_CHAIN_ID]: {
    status: "idle",
  },
})

const actions = {
  setError: (chainId: ChainId, error: string) => {
    claimUBIStore[chainId].status = "error"
    if (claimUBIStore[chainId].status === "error") {
      claimUBIStore[chainId].error = error
    }
  },
  setCanClaim: (
    chainId: ChainId,
    claimAmount: number,
    gasLimit: bigint,
    claimRequest: BroadcastRequest,
    nextClaim: number,

    dailyClaimedAmount: number,
    dailyClaimers: number,
    dailyPool: number,
  ) => {
    claimUBIStore[chainId].status = "can_claim"
    if (claimUBIStore[chainId].status === "can_claim") {
      claimUBIStore[chainId].claimAmount = claimAmount
      claimUBIStore[chainId].gasLimit = gasLimit
      claimUBIStore[chainId].claimRequest = claimRequest
      claimUBIStore[chainId].nextClaim = nextClaim

      claimUBIStore[chainId].dailyClaimedAmount = dailyClaimedAmount
      claimUBIStore[chainId].dailyClaimers = dailyClaimers
      claimUBIStore[chainId].dailyPool = dailyPool
    }
  },
  setHasClaimed: (
    chainId: ChainId,
    claimAmount: number,
    nextClaim: number,

    dailyClaimedAmount: number,
    dailyClaimers: number,
    dailyPool: number,
  ) => {
    claimUBIStore[chainId].status = "has_claimed"
    if (claimUBIStore[chainId].status === "has_claimed") {
      claimUBIStore[chainId].claimAmount = claimAmount
      claimUBIStore[chainId].nextClaim = nextClaim

      claimUBIStore[chainId].dailyClaimedAmount = dailyClaimedAmount
      claimUBIStore[chainId].dailyClaimers = dailyClaimers
      claimUBIStore[chainId].dailyPool = dailyPool
    }
  },
}

const refresh = async (chainId: ChainId, address: string | undefined) => {
  try {
    if (!address) {
      actions.setError(chainId, "No address")
      return
    }

    const identity = identityStore[chainId]
    if (identity.isLoading) {
      return
    }
    if (identity.isError) {
      actions.setError(chainId, "Identity error")
      return
    }

    if (!identity.isWhitelisted) {
      actions.setError(chainId, "Not whitelisted")
      return
    }

    const provider = MulticallWrapper.wrap(getEthersProvider(chainId))
    const contractAddress = getG$ContractAddress(chainId, "UBIScheme")
    const contract = new Contract(contractAddress, UBIScheme.abi, provider)

    const [
      paused,
      dailyUbi,
      currentDay,
      periodStart,
      [claimers, claimAmount],
      dailyCyclePool,
    ] = await Promise.all([
      // Devnet doesn't have paused funtion
      contract.paused().catch(() => Promise.resolve(false)) as Promise<boolean>,
      contract["checkEntitlement(address)"](
        identity.whitelistedRoot,
      ) as Promise<bigint>,
      contract.currentDay() as Promise<bigint>,
      contract.periodStart() as Promise<bigint>,
      contract.getDailyStats() as Promise<[bigint, bigint]>,
      contract.dailyCyclePool() as Promise<bigint>,
    ])

    if (paused) {
      actions.setError(chainId, "Contract paused")
      return
    }
    const now = Date.now()

    const periodMs = Number(periodStart) * 1000
    const nextClaim =
      periodMs < now
        ? periodMs + (Number(currentDay) + 1) * DAY_IN_MS
        : periodMs

    const amount = Number(formatG$(dailyUbi, chainId))

    const dailyClaimedAmount = Number(formatG$(claimAmount, chainId))
    const dailyClaimers = Number(claimers)
    const dailyPool = Number(formatG$(dailyCyclePool, chainId))

    // checkentitlement returns 0 if already claimed. if next day should start it will return the estimated next day dailyUbi.
    if (dailyUbi > BigInt(0)) {
      const callData = await encodeMethodCall(contract, "claim", [])
      const { gasLimit, ...broadcastRequest } = await getTx(
        chainId,
        address,
        callData,
      )
      actions.setCanClaim(
        chainId,
        amount,
        gasLimit,
        broadcastRequest,
        nextClaim,
        dailyClaimedAmount,
        dailyClaimers,
        dailyPool,
      )
      return
    } else {
      actions.setHasClaimed(
        chainId,
        amount,
        nextClaim,
        dailyClaimedAmount,
        dailyClaimers,
        dailyPool,
      )
      return
    }
  } catch (e) {
    console.error("refreshUbiStore", chainId, e)
    const error = e instanceof Error ? e.message : String(e)
    actions.setError(chainId, error)
    return
  }
}

export const refreshUbiStore = (chainId: ChainId | "all") => {
  const address = sessionState.addresses?.get("EVM")
  if (chainId === "all") {
    for (const chainId of GOODDOLLAR_NETS) {
      refresh(chainId, address)
    }
  } else {
    refresh(chainId, address)
  }
}

subscribeKey(sessionState, "addresses", () => refreshUbiStore("all"))
subscribe(identityStore, () => refreshUbiStore("all"))

setInterval(() => {
  const now = Date.now()
  for (const chainId of GOODDOLLAR_NETS) {
    const claim = claimUBIStore[chainId]
    if (claim.status === "idle" || claim.status === "error") {
      continue
    }
    // This is only true from 12:00 UTC and until the first claim for that cycle has been made.
    if (now > claim.nextClaim) {
      refreshUbiStore(chainId)
    }
  }
}, 1000)

refreshUbiStore("all")
