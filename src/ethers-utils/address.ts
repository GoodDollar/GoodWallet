import { isAddress } from "ethers/address"

import { XDC_CHAIN_ID } from "@/chain/chain-ids"

export const normalizeEvmAddress = (
  address: string,
  chainId: number,
): string =>
  chainId === XDC_CHAIN_ID && address.toLowerCase().startsWith("xdc")
    ? `0x${address.slice(3)}`
    : address

export const isValidEvmAddress = (address: string, chainId: number): boolean =>
  isAddress(normalizeEvmAddress(address, chainId))
