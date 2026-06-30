import type { InterfaceAbi } from "ethers/abi"
import type { Contract } from "ethers/contract"
import type { Provider } from "ethers/providers"

import { getEthersProvider } from "./ethersProviders"

const contractsCache = new WeakMap<Provider, WeakMap<Contract, Contract>>()

export const getContract = async (
  address: string,
  abi: InterfaceAbi,
): Promise<Contract> => {
  const { Contract } = await import("ethers/contract")
  const contract = new Contract(address, abi)
  return contract
}

export const getConnectedContract = async (
  chainId: number,
  address: string,
  abi: InterfaceAbi,
): Promise<Contract> => {
  const runner = getEthersProvider(chainId)
  const contract = await getContract(address, abi)

  if (!contractsCache.has(runner)) {
    contractsCache.set(runner, new WeakMap<Contract, Contract>())
  }

  const connected = contractsCache.get(runner) as WeakMap<Contract, Contract>

  if (!connected.has(contract)) {
    const connectedContract = contract.connect(runner) as Contract

    connected.set(contract, connectedContract)
  }

  return connected.get(contract) as Contract
}
