import { proxy } from "valtio"
import { subscribeKey } from "valtio/utils"

import { sessionState } from "@/login/context/SessionContext/storage"
import type { TokenIdentifier, TokenInfo } from "@/tokens/types"

export type Token = TokenIdentifier & TokenInfo

type SwapState = {
  origin: Token | undefined
  target: Token | undefined
  fromAmount: bigint
}

export const swapState = proxy<SwapState>({
  origin: undefined,
  target: undefined,
  fromAmount: BigInt(0),
})

export const updateOriginToken = (from: Token | undefined) => {
  swapState.origin = from
  swapState.fromAmount = BigInt(0)
}

export const updateTargetToken = (to: Token | undefined) => {
  swapState.target = to
}

export const updateSwapAmount = (amount: bigint) => {
  swapState.fromAmount = amount
}

export const clearStore = () => {
  swapState.origin = undefined
  swapState.target = undefined
  swapState.fromAmount = BigInt(0)
}

subscribeKey(sessionState, "session", clearStore)
