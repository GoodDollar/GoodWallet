import { fromHex, isAddress, isHex, toBytes } from "viem"

import {
  BITCOIN_CHAIN_ID,
  BITCOIN_TESTNET_CHAIN_ID,
  SOLANA_CHAIN_ID,
  SOLANA_DEVNET_CHAIN_ID,
} from "@/chain/chain-ids"

import { BIP122_MAINNET_CAIP2, BIP122_TESTNET_CAIP2 } from "../data/BIP122Data"
import { SOLANA_DEVNET, SOLANA_MAINNET } from "../data/SolanaData"

const isSigningAddress = (value: unknown): value is string =>
  typeof value === "string" && isAddress(value, { strict: false })

function getSigningPayload<T>(
  params: T[],
  accountIndex: 0 | 1,
  expectedAddress?: string,
) {
  if (!Array.isArray(params)) {
    throw new Error("Invalid signing request parameters")
  }
  // Prefer the RPC's documented parameter order, while supporting the legacy
  // reversed order when only that slot contains an address.
  const index = isSigningAddress(params[accountIndex])
    ? accountIndex
    : 1 - accountIndex
  const address = params[index]
  if (
    expectedAddress !== undefined &&
    (!isSigningAddress(address) ||
      address.toLowerCase() !== expectedAddress.toLowerCase())
  ) {
    throw new Error(
      "Signing request address does not match the connected account",
    )
  }
  const payload = params[1 - index]
  if (expectedAddress !== undefined && payload == null) {
    throw new Error("Missing signing request payload")
  }
  return payload
}

export function getSignParamsMessage(
  params: string[],
  output: "string" | "bytes" = "string",
  expectedAddress?: string,
) {
  const message = getSigningPayload(params, 1, expectedAddress) ?? ""
  if (isHex(message)) {
    return fromHex(message, output)
  }
  if (output === "bytes") {
    return toBytes(message)
  }
  return message
}

export function getSignTypedDataParamsData(
  params: string[],
  expectedAddress?: string,
) {
  const data = getSigningPayload(params, 0, expectedAddress)

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
