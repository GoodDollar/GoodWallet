"use client"

import { useState } from "react"
import { Button } from "ui"

import { truncateString } from "@/components/Utils/format"
import { openSwapOverlay } from "@/sections/Swap/swapOverlayStore"

import Card from "../components/Card"
import { POLYGON_CHAIN_ID } from "../constants/polymarket"
import { COLLATERAL_TOKEN_ADDRESS } from "../constants/tokens"
import useAddressCopy from "../hooks/useAddressCopy"
import useCollateralBalance from "../hooks/useCollateralBalance"
import { useTrading } from "../providers/TradingProvider"
import TransferModal from "./TransferModal"

export default function PolygonAssets() {
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const { walletAddress } = useTrading()
  const { formattedBalance, isLoading } = useCollateralBalance(walletAddress)
  const { copied: copiedSafe, copyAddress: copySafeAddress } = useAddressCopy(
    walletAddress || null,
  )

  if (!walletAddress) {
    return null
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-center text-white/70">Loading balance...</p>
      </Card>
    )
  }

  // Bridge straight to pUSD, the collateral the exchange settles in - LI.FI
  // routes to it from any supported chain and token, so there is no separate
  // wrap step.
  const handleStartSendingFlow = () => {
    openSwapOverlay({
      toChainId: POLYGON_CHAIN_ID,
      toTokenAddress: COLLATERAL_TOKEN_ADDRESS,
      toAddress: walletAddress,
    })
  }

  return (
    <>
      <Card className="p-6 text-center flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg font-semibold text-white/70">pUSD</span>
          <Button
            onClick={copySafeAddress}
            variant="outlined"
            size="small"
            text={copiedSafe ? "Copied!" : truncateString(walletAddress)}
          />
        </div>

        <p className="text-5xl font-bold">{formattedBalance}</p>

        <div className="flex justify-center gap-2">
          <Button
            onClick={handleStartSendingFlow}
            variant="solid"
            size="small"
            text="Fund"
          />
          <Button
            onClick={() => setIsTransferModalOpen(true)}
            variant="outlined"
            size="small"
            text="Withdraw"
          />
        </div>
      </Card>

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
    </>
  )
}
