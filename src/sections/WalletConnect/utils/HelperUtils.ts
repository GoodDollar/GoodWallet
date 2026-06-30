import { fromHex, isAddress, isHex, toBytes } from "viem"

import {
  BITCOIN_CHAIN_ID,
  BITCOIN_TESTNET_CHAIN_ID,
  SOLANA_CHAIN_ID,
  SOLANA_DEVNET_CHAIN_ID,
} from "@/chain/chain-ids"

import { BIP122_MAINNET_CAIP2, BIP122_TESTNET_CAIP2 } from "../data/BIP122Data"
import { SOLANA_DEVNET, SOLANA_MAINNET } from "../data/SolanaData"

/**
 * Gets message from various signing request methods by filtering out
 * a value that is not an address (thus is a message).
 * If it is a hex string, it gets converted to utf8 string
 */
export function getSignParamsMessage(
  params: string[],
  output: "string" | "bytes" = "string",
) {
  const message = params.filter((p) => !isAddress(p))[0]
  if (isHex(message)) {
    return fromHex(message, output)
  }
  if (output === "bytes") {
    return toBytes(message)
  }
  return message
}

/**
 * Gets data from various signTypedData request methods by filtering out
 * a value that is not an address (thus is data).
 * If data is a string convert it to object
 */
export function getSignTypedDataParamsData(params: string[]) {
  const data = params.filter((p) => !isAddress(p))[0]

  if (typeof data === "string") {
    return JSON.parse(data)
  }

  return data
}

export function getInternalChainId(chainId: string) {
  const family = chainId.split(":")[0]
  switch (family) {
    case "eip155":
      return Number(chainId.split(":")[1])
    case "solana":
      switch (chainId) {
        case SOLANA_MAINNET:
          return SOLANA_CHAIN_ID
        case SOLANA_DEVNET:
          return SOLANA_DEVNET_CHAIN_ID
      }
      break
    case "bip122":
      switch (chainId) {
        case BIP122_MAINNET_CAIP2:
          return BITCOIN_CHAIN_ID
        case BIP122_TESTNET_CAIP2:
          return BITCOIN_TESTNET_CHAIN_ID
      }
      break
  }
  throw new Error(`Unsupported chainId: ${chainId}`)
}
