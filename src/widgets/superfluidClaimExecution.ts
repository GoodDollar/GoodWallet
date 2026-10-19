import { createWalletClient, http } from "viem"

import { CELO_CHAIN_ID, FUSE_CHAIN_ID, XDC_CHAIN_ID } from "@/chain/chain-ids"
import { AVAILABLE_CHAINS } from "@/chain/chains"
import { getViemClient } from "@/chain/provider/EVM/viemClients"
import { rpcUrls } from "@/ethers-utils/config"
import type { EVMSigner } from "@/login/types"
import { getViemAccount } from "@/sections/Swap/adapters/viemWalletAdapter"

const CITIZEN_CLAIM_CHAIN_IDS = [
  CELO_CHAIN_ID,
  FUSE_CHAIN_ID,
  XDC_CHAIN_ID,
] as const

/**
 * Supplies the Superfluid widget with local signing clients for the chains
 * supported by its embedded citizen claim widget.
 */
export const createSuperfluidCitizenClaimExecution = (signer: EVMSigner) => {
  const account = getViemAccount(signer)
  const clientsByChain: Record<number, object> = {}

  for (const chainId of CITIZEN_CLAIM_CHAIN_IDS) {
    const chain = AVAILABLE_CHAINS.get(chainId)
    if (!chain) continue

    const rpcUrl = rpcUrls[String(chainId)] ?? chain.rpcUrls.default.http[0]
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl, {
        retryCount: 3,
        retryDelay: 1000,
      }),
    })

    clientsByChain[chainId] = {
      publicClient: getViemClient(chainId, rpcUrl),
      // Citizen SDK simulate requests carry the sender as an address string.
      // Re-attach the LocalAccount here so Viem uses eth_sendRawTransaction,
      // rather than treating the request as a JSON-RPC account and calling
      // eth_sendTransaction on the public RPC.
      walletClient: {
        ...walletClient,
        writeContract: (
          request: Parameters<typeof walletClient.writeContract>[0],
        ) => walletClient.writeContract({ ...request, account } as never),
      },
    }
  }

  return {
    mode: "custodial" as const,
    clientsByChain,
  }
}
