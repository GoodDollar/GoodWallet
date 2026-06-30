import { proxy } from "valtio"

import { clearStore } from "@/sections/Swap/swapStore"

export type SwapOverlayParams = {
  toChainId: number
  toTokenAddress: string
  toAddress?: string
}

export enum SwapOverlayStep {
  AssetSelect = 0,
  AmountInput = 1,
}

type SwapOverlayState = {
  isOverlayOpen: boolean
  params: SwapOverlayParams | null
  step: SwapOverlayStep
  handleNextStep: () => void
  handlePreviousStep: () => void
}

const handleNextStep = () => {
  swapOverlayState.step = Math.min(
    SwapOverlayStep.AmountInput,
    swapOverlayState.step + 1,
  )
}

const handlePreviousStep = () => {
  swapOverlayState.step = Math.max(
    SwapOverlayStep.AssetSelect,
    swapOverlayState.step - 1,
  )
}

export const swapOverlayState = proxy<SwapOverlayState>({
  isOverlayOpen: false,
  params: null,
  step: SwapOverlayStep.AssetSelect,
  handleNextStep,
  handlePreviousStep,
})

export const openSwapOverlay = (params: SwapOverlayParams) => {
  swapOverlayState.isOverlayOpen = true
  swapOverlayState.params = params
}

export const closeSwapOverlay = () => {
  swapOverlayState.isOverlayOpen = false
  swapOverlayState.params = null
  swapOverlayState.step = SwapOverlayStep.AssetSelect
  clearStore()
}
