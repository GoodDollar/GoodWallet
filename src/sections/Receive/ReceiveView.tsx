"use client"

import { useState } from "react"
import { Box, Button, Drawer, Icon, Text } from "ui"

import { useTranslation } from "translations"
import {
  AVAILABLE_CHAINS,
  AVAILABLE_CHAINS_IDS,
  getChainName,
} from "@/chain/chains"
import { setBottomSheetProps } from "@/components/Snippet/BottomSheet/bottomSheetStore"
import { ChainIcon } from "@/components/Typo/ChainIcon"
import { truncateString } from "@/components/Utils/format"
import { useSessionContext } from "@/login"

import { ChainSelectorSliderRow } from "../Home/components/ActivityHistory/ChainSelectorSliderRow"
import { QRCodeWithLogo } from "./components/QRCodeWithLogo"
import styles from "./ReceiveView.module.css"

const chainIds = AVAILABLE_CHAINS_IDS

import { canShare } from "@/utils/share"

export default function ReceiveView() {
  const { translations } = useTranslation()
  const receiveTranslations = translations.receive
  setBottomSheetProps({ title: receiveTranslations.title })
  const [isBottomSliderOpen, setIsBottomSliderOpen] = useState(false)

  const { addresses } = useSessionContext()

  const [currentChain, setCurrentChain] = useState(chainIds[0])
  const chain = AVAILABLE_CHAINS.get(currentChain)
  const currentSignerAddress = chain && addresses?.get(chain.family)

  // Handle case where signer or currentChain might be undefined
  if (!currentSignerAddress || !currentChain) {
    return <div>{receiveTranslations.error}</div>
  }

  return (
    <div className={styles.container}>
      <Box vertical elevation="high">
        <div
          className={styles.selectContainer}
          onClick={() => setIsBottomSliderOpen(true)}
          role="button"
        >
          <ChainIcon chainId={currentChain} />
          <Text style="16-400">{getChainName(currentChain)}</Text>
          <Icon
            name={isBottomSliderOpen ? "BsChevronUp" : "BsChevronDown"}
            size="small"
          />
        </div>

        <QRCodeWithLogo
          value={currentSignerAddress}
          logo={"/icon.svg"}
          style={{ filter: "grayscale(100%)" }}
        />

        <Text style="16-400">{receiveTranslations.scan}</Text>
      </Box>

      <Box elevation="high">
        <Text style="16-400" translate="no">
          {truncateString(currentSignerAddress, 8)}
        </Text>

        <Box width="content">
          {canShare(currentSignerAddress) && (
            <Button
              variant="pill"
              text="Share"
              onClick={() => navigator.share({ text: currentSignerAddress })}
            />
          )}
          <Button
            variant="pill"
            icon="BsCopy"
            copyValue={currentSignerAddress}
          />
        </Box>
      </Box>

      <Drawer
        open={isBottomSliderOpen}
        onClose={() => setIsBottomSliderOpen(false)}
      >
        <Box vertical scroll gap="none">
          {chainIds.map((chainId) => {
            return (
              <ChainSelectorSliderRow
                key={chainId}
                chainId={chainId}
                onClick={() => {
                  setCurrentChain(chainId)
                  setIsBottomSliderOpen(false)
                }}
                selected={chainId === currentChain}
              />
            )
          })}
        </Box>
      </Drawer>
    </div>
  )
}
