// biome-ignore-all lint/suspicious/noExplicitAny: need to cast the window
"use client"

import type { ISigner } from "@/login"

type LoginMessage = {
  type: "LOGIN"
  addresses: Array<{
    type: keyof ISigner
    address: string
  }>
  user: {
    username: string
    profilePictureUrl: string | null
  }
}

type ExitGoodWalletAppMessage = {
  type: "EXIT_GOODWALLET_APP"
}

type LogOutMessage = {
  type: "LOGOUT"
}

type GoodDollarClaimed = {
  type: "GOODDOLLAR_CLAIMED"
  chainId: number
  amount: number
}

type Message =
  | LogOutMessage
  | LoginMessage
  | ExitGoodWalletAppMessage
  | GoodDollarClaimed

export const postMessageToReactNative = (message: Message) =>
  (window as any).ReactNativeWebView?.postMessage(JSON.stringify(message))
