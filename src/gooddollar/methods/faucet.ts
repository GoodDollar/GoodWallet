import Faucet from "@gooddollar/goodprotocol/artifacts/abis/Faucet.min.json"
import { Contract } from "ethers"
import { MulticallWrapper } from "ethers-multicall-provider"

import { FUSE_CHAIN_ID, XDC_CHAIN_ID } from "@/chain/chain-ids"
import { config } from "@/config"
import {
  type BroadcastOptions,
  encodeMethodCall,
  getEthersProvider,
  sendTxWaitForMining,
  ZERO_ADDRESS,
} from "@/ethers-utils"
import type { EVMSigner, SessionType } from "@/login/types"

import { configureContracts } from "../config"
import { getG$ContractAddress } from "../contracts/pool"
import { getTx } from "../stores/utils"
import type { ChainId } from "../types"
import { g$Api, postJson } from "../utils"

const LAST_TOPPED_UTC_MS_KEY = (chainId: number) =>
  `goodDollarFaucetLastToppedUtcMs_${chainId}`

configureContracts(config.g$claim.contracts)

type TopWalletResult = Promise<
  "skipped" | "error" | "topped_via_contract" | "topped_via_api"
>
const topWalletMutex = new Map<ChainId, TopWalletResult>()

export const topWallet = (
  signer: EVMSigner,
  chainId: ChainId,
  broadcastOptions: BroadcastOptions,
  type: SessionType,
): TopWalletResult => {
  if (topWalletMutex.has(chainId)) {
    return topWalletMutex.get(chainId) as TopWalletResult
  }

  const execution = _topWallet(signer, chainId, broadcastOptions, type)
    .catch((e) => {
      console.error("Error in topWallet:", e)
      return "error" as const
    })
    .finally(() => topWalletMutex.delete(chainId))
  topWalletMutex.set(chainId, execution)
  return execution
}

const _topWallet = async (
  signer: EVMSigner,
  chainId: ChainId,
  broadcastOptions: BroadcastOptions,
  _type: SessionType,
): Promise<"skipped" | "error" | "topped_via_contract" | "topped_via_api"> => {
  //Throttle calls to once per hour
  const lastToppedMs = localStorage.getItem(LAST_TOPPED_UTC_MS_KEY(chainId))
  if (lastToppedMs) {
    const nextTop = parseInt(lastToppedMs) + 1000 * 60 * 60
    if (Date.now() < nextTop) {
      return "skipped"
    }
  }

  const provider = MulticallWrapper.wrap(getEthersProvider(chainId))
  const contractAddress = getG$ContractAddress(
    chainId,
    chainId === FUSE_CHAIN_ID ? "FuseFaucet" : "Faucet",
  )
  const contract = new Contract(contractAddress, Faucet.abi, provider)

  const [balance, canTop, toppingAmount] = await Promise.all([
    provider.getBalance(signer.address),
    contract.canTop(signer.address) as Promise<boolean>,
    contract.getToppingAmount() as Promise<bigint>,
  ])

  // Trigger the faucet only if the wallet balance is below 50% of the topping amount.
  // The smart contract currently enforces a 30% threshold.
  if (canTop && balance < toppingAmount / BigInt(2)) {
    localStorage.setItem(LAST_TOPPED_UTC_MS_KEY(chainId), Date.now().toString())
    try {
      const callData = await encodeMethodCall(contract, "topWallet", [
        signer.address,
      ])
      const { gasLimit, ...broadcastRequest } = await getTx(
        chainId,
        // XDC's faucet contract requires the from address to be ZERO_ADDRESS
        chainId === XDC_CHAIN_ID ? ZERO_ADDRESS : signer.address,
        callData,
      )
      if (balance < gasLimit) {
        throw new Error("Not enough balance to pay for gas")
      }
      if (gasLimit > toppingAmount) {
        throw new Error("Gas limit exceeds topping amount")
      }
      await sendTxWaitForMining(
        signer,
        gasLimit,
        broadcastRequest,
        broadcastOptions,
        true,
      )
      return "topped_via_contract"
    } catch {
      const result = await topWalletViaAPI(chainId, signer)
      return Number(result.ok) > 0 ? "topped_via_api" : "error"
    }
  }
  return "skipped"
}

const topWalletViaAPI = async (chainId: ChainId, signer: EVMSigner) => {
  const result = await postJson(
    "/verify/topWallet",
    { chainId, account: signer.address },
    g$Api(),
  )
  return result
}
