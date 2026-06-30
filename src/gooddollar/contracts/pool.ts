"use client"

import Faucet from "@gooddollar/goodprotocol/artifacts/abis/Faucet.min.json"
import GoodDollar from "@gooddollar/goodprotocol/artifacts/abis/GoodDollar.min.json"
import Identity from "@gooddollar/goodprotocol/artifacts/abis/IdentityV2.min.json"
import Invites from "@gooddollar/goodprotocol/artifacts/abis/InvitesV2.min.json"
import UBIScheme from "@gooddollar/goodprotocol/artifacts/abis/UBIScheme.min.json"
import ContractsAddress from "@gooddollar/goodprotocol/releases/deployment.json"
import type { InterfaceAbi } from "ethers/abi"
import type { Contract } from "ethers/contract"

import { getConnectedContract } from "ethers-utils"

import OneTimeReward from "../abi/OneTimeReward.min.json"
import { getContractsNetwork } from "../config"

const abis: Record<string, { abi: InterfaceAbi }> = {
  FuseFaucet: Faucet,
  UBIScheme,
  Identity,
  Faucet,
  GoodDollar,
  OneTimeReward,
  Invites,
}

//TODO OneTimeReward not yet added to deployment.json
const getIfOneTimeRewardContract = (network: string, name: string) => {
  if (name == "OneTimeReward") {
    switch (network) {
      case "development-celo":
      case "staging-celo":
        return "0xF58E641d74149E50Ab8B79579b1d3eF9451F7B82"
      case "production-celo":
        return "0xD0ff9EB4f7cf171358591596fb6BAb2DA203c2A5"
    }
  }

  return undefined
}

export const getG$ContractAddress = (chainId: number, name: string): string => {
  const network = getContractsNetwork(chainId)

  const oneTimeRewardAddress = getIfOneTimeRewardContract(network, name)
  if (oneTimeRewardAddress) {
    return oneTimeRewardAddress
  }

  const address = (ContractsAddress as Record<string, Record<string, unknown>>)[
    network
  ]?.[name] as string

  if (!address || !(name in abis)) {
    throw new Error(
      `Couldn't locale address or ABI artifact for '${name}' contract at chain ID '${chainId}'.`,
    )
  }

  return address
}

export const getConnectedG$Contract = async (
  chainId: number,
  name: string,
): Promise<Contract> => {
  const address = getG$ContractAddress(chainId, name)

  return getConnectedContract(chainId, address, abis[name].abi)
}
