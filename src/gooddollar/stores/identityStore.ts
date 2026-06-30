import Identity from "@gooddollar/goodprotocol/artifacts/abis/IdentityV2.min.json"
import { Contract } from "ethers"
import { MulticallWrapper } from "ethers-multicall-provider"
import { proxy } from "valtio"
import { subscribeKey } from "valtio/utils"
import { type Address, zeroAddress } from "viem"

import { CELO_CHAIN_ID, FUSE_CHAIN_ID, XDC_CHAIN_ID } from "@/chain/chain-ids"
import { config } from "@/config"
import { getEthersProvider } from "@/ethers-utils"
import { sessionState } from "@/login/context/SessionContext/storage"

import { configureContracts } from "../config"
import { getG$ContractAddress } from "../contracts/pool"
import { type ChainId, GOODDOLLAR_NETS } from "../types"
import { errorState, loadingState } from "./utils"

type ValidState = {
  isLoading: false
  isError: false
  isWhitelisted: boolean
  whitelistedOnChainOrDefault: number
  whitelistedRoot: Address
}

export type IdentityState = typeof loadingState | typeof errorState | ValidState

configureContracts(config.g$claim.contracts)
export const identityStore = proxy<Record<ChainId, IdentityState>>({
  [FUSE_CHAIN_ID]: loadingState,
  [CELO_CHAIN_ID]: loadingState,
  [XDC_CHAIN_ID]: loadingState,
})

const refresh = async (chainId: ChainId, address: string | undefined) => {
  if (!address) {
    identityStore[chainId] = errorState
    return
  }
  try {
    const provider = MulticallWrapper.wrap(getEthersProvider(chainId))
    const contractAddress = getG$ContractAddress(chainId, "Identity")
    const contract = new Contract(contractAddress, Identity.abi, provider)
    const [whitelistedRoot, whitelistedOnChainOrDefault] = await Promise.all([
      contract.getWhitelistedRoot(address) as Promise<Address>,
      contract.getWhitelistedOnChainId(address) as Promise<bigint>,
    ])
    identityStore[chainId] = {
      isLoading: false,
      isError: false,
      whitelistedRoot,
      isWhitelisted: whitelistedRoot !== zeroAddress,
      whitelistedOnChainOrDefault: Number(whitelistedOnChainOrDefault),
    }
  } catch (e) {
    console.log("IdentityStore error", e)
    identityStore[chainId] = errorState
  }
}

export const refreshIdentityStore = () => {
  const address = sessionState.addresses?.get("EVM")
  for (const chainId of GOODDOLLAR_NETS) {
    refresh(chainId, address)
  }
}

subscribeKey(sessionState, "addresses", refreshIdentityStore)

refreshIdentityStore()
