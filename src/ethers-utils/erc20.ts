import { Interface } from "ethers/abi"

import type { BroadcastRequest } from "./types"

const ERC20_ABI = [
  // Read-Only Functions
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",

  // Authenticated Functions
  "function transfer(address to, uint amount) returns (bool)",

  // Events
  "event Transfer(address indexed from, address indexed to, uint amount)",
]

const ERC20Interface = Interface.from(ERC20_ABI)

export const craftERC20TransferCalldata = (
  to: string,
  amountUnits: bigint,
): NonNullable<BroadcastRequest["data"]> => {
  return ERC20Interface.encodeFunctionData("transfer", [to, amountUnits])
}
