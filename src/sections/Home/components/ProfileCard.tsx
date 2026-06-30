"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Jazzicon, { jsNumberForAddress } from "react-jazzicon"
import { Box, Button, createToast, Drawer, Icon } from "ui"

import { AnalyticsEventTypes } from "@/analytics/types"
import { useAnalytics } from "@/analytics/useAnalytics"
import { AVAILABLE_CHAINS, AVAILABLE_CHAINS_IDS } from "@/chain/chains"
import { formatTokenValue } from "@/components/Utils/tokenFormat"
import { useSessionContext } from "@/login"
import {
  CURRENCY_SYMBOLS,
  type CurrencyCode,
  selectCurrency,
  useAvailableCurrencies,
  useSelectedCurrency,
} from "@/stores/currencyStore"
import { useTranslation } from "@/translations"
import { getCachedProfileImage } from "@/utils/getCachedProfileImage"

import { ChainSelectorSliderRow } from "./ActivityHistory/ChainSelectorSliderRow"

type ProfileCardProps = {
  userName?: string
  profileImage?: string
  aggregatedUsdValue?: string
  isLoadingValue?: boolean
  onClickOptions?: () => void
}

export const ProfileCard = ({
  userName,
  profileImage,
  aggregatedUsdValue,
  isLoadingValue,
}: ProfileCardProps) => {
  const { translations } = useTranslation()
  const { signer, addresses } = useSessionContext()
  const { captureEvent } = useAnalytics()
  const [isBottomSliderOpen, setIsBottomSliderOpen] = useState(false)
  const [isCurrencySliderOpen, setIsCurrencySliderOpen] = useState(false)
  const [cachedSrc, setCachedSrc] = useState<string | null>(null)
  const [isLoadingImage, setIsLoadingImage] = useState(false)

  const availableCurrencies = useAvailableCurrencies()
  const selectedCurrency = useSelectedCurrency()

  useEffect(() => {
    if (!profileImage) return

    setIsLoadingImage(true)
    getCachedProfileImage(profileImage)
      .then((src) => setCachedSrc(src))
      .finally(() => setIsLoadingImage(false))
  }, [profileImage])

  const handleCurrencyChange = (currency: string) => {
    selectCurrency(currency as CurrencyCode)
    setIsCurrencySliderOpen(false)
  }

  const handleCopyPublicKey = async (chainId: number) => {
    const chain = AVAILABLE_CHAINS.get(chainId)
    const address = chain && addresses?.get(chain?.family)
    if (!address) {
      return
    }
    navigator.clipboard.writeText(address)
    captureEvent({
      type: AnalyticsEventTypes.PublicKeyCopied,
      family: chain.family,
    })
    createToast({
      message: translations.options.copiedPublicKey,
      status: "success",
      autoClose: true,
    })
  }

  return (
    <>
      <div
        className={[
          "gradient-background relative rounded-2xl",
          isLoadingValue || isLoadingImage ? "animate-pulse" : "",
        ].join(" ")}
      >
        <div
          className="flex blur-md absolute -z-10 stick-to-parent rounded-2xl"
          style={{ background: "var(--brand-gradient)" }}
        />
        <div className="flex flex-col p-5 rounded-2xl bg-[var(--token-bg)]">
          <div className="flex flex-col gap-8">
            <div className="flex gap-3 justify-between">
              <div className="flex items-center gap-3">
                {cachedSrc ? (
                  <Image
                    alt={userName ?? ""}
                    src={cachedSrc}
                    unoptimized
                    placeholder="empty"
                    height={34}
                    width={34}
                    style={{
                      borderRadius: "50%",
                      height: "34px",
                      width: "34px",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <Jazzicon
                    diameter={34}
                    seed={jsNumberForAddress(signer?.EVM.address ?? "")}
                  />
                )}
                <div className="items-start sentry-mask">
                  <h5>{userName}</h5>
                </div>
              </div>
            </div>

            <div
              className="flex gap-3 justify-between items-end cursor-pointer"
              onClick={() => setIsCurrencySliderOpen(true)}
            >
              <div className="text-4xl text-gradient-color">
                <span className="font-semibold">
                  {formatTokenValue(aggregatedUsdValue ?? 0, selectedCurrency)}
                </span>
              </div>
            </div>

            <div className="absolute top-5 right-5 flex items-center">
              <Button
                variant="pill"
                icon="BsCopy"
                onClick={() => setIsBottomSliderOpen((v) => !v)}
              />
            </div>
          </div>
        </div>
      </div>

      <Drawer
        open={isBottomSliderOpen}
        onClose={() => setIsBottomSliderOpen(false)}
      >
        <Box vertical gap="none" scroll>
          {AVAILABLE_CHAINS_IDS.map((chainId) => {
            return (
              <ChainSelectorSliderRow
                key={chainId}
                chainId={chainId}
                onClick={() => {
                  handleCopyPublicKey(chainId)
                  setIsBottomSliderOpen(false)
                }}
                selected={false}
              />
            )
          })}
        </Box>
      </Drawer>

      {/* Currency Selector Slider */}
      <Drawer
        open={isCurrencySliderOpen}
        onClose={() => setIsCurrencySliderOpen(false)}
      >
        <Box vertical gap="none">
          {availableCurrencies.map((currency) => (
            <div
              key={currency}
              className="flex items-center justify-between py-4 cursor-pointer w-full border-b border-[#2a2a2a] last:border-b-0"
              onClick={() => handleCurrencyChange(currency)}
            >
              <div className="flex items-center gap-2">
                {CURRENCY_SYMBOLS[currency] && (
                  <span className="text-2xl font-medium text-gradient-color mr-1">
                    {CURRENCY_SYMBOLS[currency]}
                  </span>
                )}
                <span className="font-medium">{currency}</span>
              </div>
              {selectedCurrency.currency === currency && (
                <Icon name="BsCheckLg" size="big" />
              )}
            </div>
          ))}
        </Box>
      </Drawer>
    </>
  )
}
