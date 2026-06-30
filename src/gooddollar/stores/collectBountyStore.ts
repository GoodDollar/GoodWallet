import { proxy } from "valtio"
import { subscribeKey } from "valtio/utils"

import { CELO_CHAIN_ID, XDC_CHAIN_ID } from "@/chain/chain-ids"
import { config } from "@/config"
import {
  type BroadcastRequest,
  isSameAddress,
  ZERO_ADDRESS,
} from "@/ethers-utils"
import { configureContracts, formatG$ } from "@/gooddollar"
import { identityStore } from "@/gooddollar/stores/identityStore"
import {
  type INVITEABLE_CHAIN_ID,
  inviteCodeStore,
} from "@/gooddollar/stores/inviteCodeStore"
import { inviteStore } from "@/gooddollar/stores/inviteStore"
import { getTx } from "@/gooddollar/stores/utils"
import { sessionState } from "@/login/context/SessionContext/storage"

const isLoadingState = {
  isLoading: true,
} as const

type CollectBountyState = {
  isLoading: false
  canCollect: boolean
  canJoin: boolean
  amount: number
  gasLimit: bigint
  collectRequest: BroadcastRequest
}

const canNotCollectState = {
  isLoading: false,
  canCollect: false,
  canJoin: false,
} as const

type CollectBountyStore =
  | typeof isLoadingState
  | typeof canNotCollectState
  | CollectBountyState

configureContracts(config.g$claim.contracts)
export const collectBountyStore = proxy<
  Record<INVITEABLE_CHAIN_ID, { state: CollectBountyStore }>
>({
  [CELO_CHAIN_ID]: { state: isLoadingState },
  [XDC_CHAIN_ID]: { state: isLoadingState },
})

const refreshCollectStore = async (chainId: INVITEABLE_CHAIN_ID) => {
  collectBountyStore[chainId].state = isLoadingState

  try {
    const address = sessionState.addresses?.get("EVM")
    const identityState = identityStore[chainId]
    const inviteState = inviteStore[chainId]

    if (!address || identityState.isLoading || inviteState.isLoading) {
      collectBountyStore[chainId].state = isLoadingState
      return
    }

    if (identityState.isError || inviteState.isError) {
      console.warn("Error loading identity or invite state")
      collectBountyStore[chainId].state = canNotCollectState
      return
    }

    if (!inviteState.active || inviteState.user.bountyPaid) {
      collectBountyStore[chainId].state = canNotCollectState
      return
    }

    const amount = Number(
      formatG$(inviteState.bountyLevel.bounty / BigInt(2), chainId),
    )

    if (inviteState.canCollectBounty) {
      const callData = await inviteState.getCollectCallData()
      const { gasLimit, ...broadCastRequest } = await getTx(
        chainId,
        address,
        callData,
      )
      collectBountyStore[chainId].state = {
        isLoading: false,
        canCollect: true,
        canJoin: false,
        amount,
        gasLimit,
        collectRequest: broadCastRequest,
      }
      return
    }

    if (
      !identityState.isWhitelisted ||
      identityState.whitelistedOnChainOrDefault !== chainId
    ) {
      console.log("Wrong whitelist status", identityState)
      collectBountyStore[chainId].state = canNotCollectState
      return
    }

    const inviteCode = inviteCodeStore.inviteCode
    if (!inviteCode) {
      console.log("No inviter code")
      collectBountyStore[chainId].state = canNotCollectState
      return
    }

    const inviterAddress = await inviteState.getAddressForInviteCode(inviteCode)
    if (isSameAddress(inviterAddress, ZERO_ADDRESS)) {
      console.log("No need in joining Zero Address")
      collectBountyStore[chainId].state = canNotCollectState
      return
    }

    if (isSameAddress(inviterAddress, address)) {
      console.log("Attempted self-invite")
      collectBountyStore[chainId].state = canNotCollectState
      return
    }

    const callData = await inviteState.getJoinCallData(inviteCode)
    const { gasLimit, ...broadCastRequest } = await getTx(
      chainId,
      address,
      callData,
    )
    collectBountyStore[chainId].state = {
      isLoading: false,
      canCollect: false,
      canJoin: true,
      amount: 0,
      gasLimit,
      collectRequest: broadCastRequest,
    }
    return
  } catch (e) {
    console.error("Error in collect bounty store", e)
    collectBountyStore[chainId].state = canNotCollectState
  }
}

subscribeKey(collectBountyStore, CELO_CHAIN_ID, () => {
  console.log(
    "collectBountyStore state changed",
    collectBountyStore[CELO_CHAIN_ID].state,
  )
})
subscribeKey(collectBountyStore, XDC_CHAIN_ID, () => {
  console.log(
    "collectBountyStore state changed",
    collectBountyStore[XDC_CHAIN_ID].state,
  )
})

const refreshCollectStores = () => {
  refreshCollectStore(CELO_CHAIN_ID)
  refreshCollectStore(XDC_CHAIN_ID)
}
subscribeKey(sessionState, "addresses", () => refreshCollectStores())
subscribeKey(identityStore, CELO_CHAIN_ID, () =>
  refreshCollectStore(CELO_CHAIN_ID),
)
subscribeKey(inviteStore, CELO_CHAIN_ID, () =>
  refreshCollectStore(CELO_CHAIN_ID),
)
subscribeKey(identityStore, XDC_CHAIN_ID, () =>
  refreshCollectStore(XDC_CHAIN_ID),
)
subscribeKey(inviteStore, XDC_CHAIN_ID, () => refreshCollectStore(XDC_CHAIN_ID))
subscribeKey(inviteCodeStore, "inviteCode", () => refreshCollectStores())

refreshCollectStores()
