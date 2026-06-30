import { proxy, useSnapshot } from "valtio"

import type { TokenIdentifier } from "@/tokens/types"

type SendForm = {
  toAddress: string | undefined
  toEns: string | undefined
  amountInCrypto: string | undefined
  tokenId: TokenIdentifier | undefined
  amountInSelectedCurrency: string | undefined
  show: "crypto" | "selectedCurrency"
}

const formState = proxy<SendForm>({
  toAddress: undefined,
  toEns: undefined,
  amountInCrypto: undefined,
  tokenId: undefined,
  amountInSelectedCurrency: undefined,
  show: "crypto",
})

export const useFormSnapshot = () => useSnapshot(formState)

export const setToAddress = (toAddress: string | undefined) =>
  (formState.toAddress = toAddress)
export const setToEns = (toEns: string | undefined) => (formState.toEns = toEns)
export const setAmount = (amount: string | undefined) =>
  (formState.amountInCrypto = amount)
export const setTokenId = (tokenId: TokenIdentifier | undefined) =>
  (formState.tokenId = tokenId)
export const setAmountInSelectedCurrency = (amount: string | undefined) =>
  (formState.amountInSelectedCurrency = amount)
export const setShow = (show: "crypto" | "selectedCurrency") =>
  (formState.show = show)
export const resetFormData = () => {
  formState.toAddress = undefined
  formState.toEns = undefined
  formState.amountInCrypto = undefined
  formState.tokenId = undefined
  formState.amountInSelectedCurrency = undefined
  formState.show = "crypto"
}
