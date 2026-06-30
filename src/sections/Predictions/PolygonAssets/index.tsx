"use client"

import { useState } from "react"
import { Button } from "ui"

import { truncateString } from "@/components/Utils/format"
import { openSwapOverlay } from "@/sections/Swap/swapOverlayStore"

import Card from "../components/Card"
import { POLYGON_CHAIN_ID } from "../constants/polymarket"
import { USDC_E_CONTRACT_ADDRESS } from "../constants/tokens"
import useAddressCopy from "../hooks/useAddressCopy"
import usePolygonBalances from "../hooks/usePolygonBalances"
import useSafeDeployment from "../hooks/useSafeDeployment"
import { useWallet } from "../providers/WalletContext"
import TransferModal from "./TransferModal"

export default function PolygonAssets() {
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const { eoaAddress } = useWallet()
  const { derivedSafeAddressFromEoa } = useSafeDeployment(eoaAddress)
  const { formattedUsdcBalance, isLoading } = usePolygonBalances(
    derivedSafeAddressFromEoa,
  )
  const { copied: copiedSafe, copyAddress: copySafeAddress } = useAddressCopy(
    derivedSafeAddressFromEoa || null,
  )

  if (!derivedSafeAddressFromEoa) {
    return null
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-center text-white/70">Loading balance...</p>
      </Card>
    )
  }

  const handleStartSendingFlow = () => {
    openSwapOverlay({
      toChainId: POLYGON_CHAIN_ID,
      toTokenAddress: USDC_E_CONTRACT_ADDRESS,
      toAddress: derivedSafeAddressFromEoa,
    })
  }

  return (
    <>
      <Card className="p-6 text-center flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg font-semibold text-white/70">USDC.e</span>
          <Button
            onClick={copySafeAddress}
            variant="outlined"
            size="small"
            text={
              copiedSafe ? "Copied!" : truncateString(derivedSafeAddressFromEoa)
            }
          />
        </div>

        <p className="text-5xl font-bold">{formattedUsdcBalance}</p>

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
