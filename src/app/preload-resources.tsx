import ReactDOM from "react-dom"

import { config } from "@/config"

export function PreloadResources() {
  const tokensUrl = "/api/tokens"

  // Tokens
  ReactDOM.preconnect(tokensUrl)
  ReactDOM.preload(tokensUrl, { as: "fetch", crossOrigin: "anonymous" })

  // RPCs
  Object.values(config.rpcUrls).forEach((rpcUrl) => {
    ReactDOM.preconnect(rpcUrl)
  })
  return null
}
