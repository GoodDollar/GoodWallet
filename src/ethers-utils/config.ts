import type { RpcUrls } from "./types"

export const rpcUrls: Partial<RpcUrls> = {}

export const setCustomRpcUrls = (urls: Partial<RpcUrls>) => {
  if (Object.keys(rpcUrls).length !== 0) {
    throw new Error("RPC urls already configured.")
  }

  Object.assign(rpcUrls, urls)
}
