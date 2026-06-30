import type { RouteExtended } from "@lifi/sdk"
import { formatUnits } from "ethers"

import { type Tx, TxDirection } from "@/hooks/useLedger/types"

export const getPropagatingTxs = (routeExtended: RouteExtended): Tx[] => {
  const propagatingTxs: Tx[] = []
  // v4 no longer reports a per-action completion timestamp, so we stamp at read time.
  const timestamp = Date.now() / 1000
  for (const step of routeExtended.steps) {
    const { action, estimate, execution } = step
    if (!execution) {
      continue
    }
    const { toToken, fromToken, fromAddress, fromAmount, toAddress } = action
    for (const executionAction of execution.actions) {
      if (!executionAction.txHash || executionAction.status !== "DONE") {
        continue
      }

      switch (executionAction.type) {
        case "CROSS_CHAIN": {
          if (!fromAddress) {
            continue
          }
          const amount = formatUnits(fromAmount, fromToken.decimals)
          propagatingTxs.push({
            chainId: fromToken.chainId,
            hash: executionAction.txHash,
            amount,
            timestamp,
            from: fromAddress,
            to: estimate.approvalAddress,
            tokenAddress: fromToken.address,
            method: estimate.tool,
            txDirection: TxDirection.OUTGOING,
          })
          break
        }
        case "SWAP": {
          const amount = formatUnits(estimate.toAmount, toToken.decimals)
          if (!toAddress) {
            continue
          }
          propagatingTxs.push({
            chainId: toToken.chainId,
            hash: executionAction.txHash,
            amount,
            timestamp,
            from: estimate.approvalAddress,
            to: toAddress,
            tokenAddress: toToken.address,
            method: estimate.tool,
            txDirection: TxDirection.INCOMING,
          })
        }
      }
    }
  }
  return propagatingTxs
}
