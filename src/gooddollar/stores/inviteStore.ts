import Invites from "@gooddollar/goodprotocol/artifacts/abis/InvitesV2.min.json"
import {
  Contract,
  decodeBytes32String,
  encodeBase58,
  encodeBytes32String,
} from "ethers"
import { MulticallWrapper } from "ethers-multicall-provider"
import { proxy } from "valtio"
import { subscribeKey } from "valtio/utils"

import { CELO_CHAIN_ID, XDC_CHAIN_ID } from "@/chain/chain-ids"
import { config } from "@/config"
import {
  type EncodedMethod,
  encodeMethodCall,
  getEthersProvider,
  isSameAddress,
  ZERO_ADDRESS,
} from "@/ethers-utils"
import { sessionState } from "@/login/context/SessionContext/storage"

import { configureContracts } from "../config"
import { getG$ContractAddress } from "../contracts/pool"
import type { INVITEABLE_CHAIN_ID } from "./inviteCodeStore"
import { errorState, loadingState } from "./utils"

export type User = {
  invitedBy: string
  inviteCode: string
  bountyPaid: boolean
  level: bigint
  levelStarted: bigint
  totalApprovedInvites: bigint
  totalEarned: bigint
  joinedAt: bigint
  bountyAtJoin: bigint
}

const mapToUser = (arr: string[]): User => ({
  invitedBy: arr[0],
  inviteCode: decodeBytes32String(arr[1]),
  bountyPaid: arr[2] === "true",
  level: BigInt(arr[3]),
  levelStarted: BigInt(arr[4]),
  totalApprovedInvites: BigInt(arr[5]),
  totalEarned: BigInt(arr[6]),
  joinedAt: BigInt(arr[7]),
  bountyAtJoin: BigInt(arr[8]),
})

export type Stats = {
  totalApprovedInvites: bigint
  totalBountiesPaid: bigint
  totalInvited: bigint
}

const mapToStats = (arr: string[]): Stats => ({
  totalApprovedInvites: BigInt(arr[0]),
  totalBountiesPaid: BigInt(arr[1]),
  totalInvited: BigInt(arr[2]),
})

export type Level = {
  toNext: bigint
  bounty: bigint
  daysToComplete: bigint
}

const mapToLevel = (arr: string[]): Level => ({
  toNext: BigInt(arr[0]),
  bounty: BigInt(arr[1]),
  daysToComplete: BigInt(arr[2]),
})

type ValidState = {
  isLoading: false
  isError: false
  active: boolean
  canCollectBounty: boolean
  minimumDays: number
  minimumClaims: number
  invitees: string[]
  pendingBounties: bigint
  pendingInvitees: string[]
  user: User
  stats: Stats
  bountyLevel: Level

  getAddressForInviteCode: (inviteCode: string) => Promise<string>

  getJoinCallData: (inviterCode: string | null) => Promise<EncodedMethod>
  getCollectCallData: () => Promise<EncodedMethod>
}

const calculateInviteCode = async (
  address: string,
  getAddressForCode: ValidState["getAddressForInviteCode"],
) => {
  const codeBuffer = Buffer.from(address.slice(2), "hex")
  const bs58 = encodeBase58(codeBuffer)
  for (let codeLength = 10; codeLength < 31; codeLength++) {
    const code = bs58.slice(0, codeLength)
    const addressForCode = await getAddressForCode(code)
    if (isSameAddress(address, addressForCode)) {
      throw new Error("Address already registered!")
    }
    if (isSameAddress(ZERO_ADDRESS, addressForCode)) {
      return code
    }
  }
  throw new Error("Couldn't find unique invite code!")
}

type InviteState = typeof loadingState | typeof errorState | ValidState

configureContracts(config.g$claim.contracts)
export const inviteStore = proxy<Record<INVITEABLE_CHAIN_ID, InviteState>>({
  [CELO_CHAIN_ID]: loadingState,
  [XDC_CHAIN_ID]: loadingState,
})

const refresh = async (
  chainId: INVITEABLE_CHAIN_ID,
  address: string | undefined,
) => {
  if (!address) {
    inviteStore[chainId] = errorState
    return
  }
  inviteStore[chainId] = loadingState

  try {
    const provider = MulticallWrapper.wrap(getEthersProvider(chainId))
    const contractAddress = getG$ContractAddress(chainId, "Invites")
    const contract = new Contract(contractAddress, Invites.abi, provider)

    const [
      active,
      canCollectBounty,
      invitees,
      pendingBounties,
      pendingInvitees,
      user,
      stats,
      level,
      minimumDays,
      minimumClaims,
    ] = await Promise.all([
      contract.active() as Promise<ValidState["active"]>,
      contract.canCollectBountyFor(address) as Promise<
        ValidState["canCollectBounty"]
      >,
      contract.getInvitees(address) as Promise<ValidState["invitees"]>,
      contract.getPendingBounties(address) as Promise<
        ValidState["pendingBounties"]
      >,
      contract.getPendingInvitees(address) as Promise<
        ValidState["pendingInvitees"]
      >,
      contract.users(address).then(mapToUser),
      contract.stats().then(mapToStats),
      //Prefetch the most common level, level 0 before knowing the actual user-level
      contract.levels(0).then(mapToLevel),
      contract.minimumDays(),
      contract.minimumClaims(),
    ])
    const bountyLevel =
      user.level === BigInt(0)
        ? level
        : await contract.levels(user.level).then(mapToLevel)

    const getAddressForInviteCode = (inviteCode: string) => {
      if (
        inviteCode.startsWith("http://") ||
        inviteCode.startsWith("https://")
      ) {
        const inviteCodeParam = new URL(inviteCode).searchParams.get(
          "inviteCode",
        )
        if (!inviteCodeParam) {
          throw new Error("Invite code not found in URL")
        }

        inviteCode = inviteCodeParam
      }
      return contract.codeToUser(encodeBytes32String(inviteCode)) as ReturnType<
        ValidState["getAddressForInviteCode"]
      >
    }

    inviteStore[chainId] = {
      isLoading: false,
      isError: false,
      active,
      canCollectBounty,
      minimumDays: Number(minimumDays),
      minimumClaims: Number(minimumClaims),
      invitees,
      pendingBounties,
      pendingInvitees,
      user,
      stats,
      bountyLevel,

      getAddressForInviteCode,

      getJoinCallData: async (inviteCode) => {
        if (
          inviteCode &&
          (inviteCode.startsWith("http://") ||
            inviteCode.startsWith("https://"))
        ) {
          const inviteCodeParam = new URL(inviteCode).searchParams.get(
            "inviteCode",
          )
          if (!inviteCodeParam) {
            throw new Error("Invite code not found in URL")
          }
          inviteCode = inviteCodeParam
        }
        const myCode =
          user.inviteCode.length > 0
            ? user.inviteCode
            : await calculateInviteCode(address, getAddressForInviteCode)
        return encodeMethodCall(contract, "join", [
          encodeBytes32String(myCode),
          encodeBytes32String(inviteCode ?? ""),
        ])
      },
      getCollectCallData: async () =>
        encodeMethodCall(contract, "bountyFor", [address]),
    }
  } catch (e) {
    console.log("InviteStore error", e)
    inviteStore[chainId] = errorState
  }
}

export const refreshInviteStore = () => {
  const address = sessionState.addresses?.get("EVM")
  refresh(CELO_CHAIN_ID, address)
  refresh(XDC_CHAIN_ID, address)
}
subscribeKey(sessionState, "addresses", refreshInviteStore)

refreshInviteStore()
