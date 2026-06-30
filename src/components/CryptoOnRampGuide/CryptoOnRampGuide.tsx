"use client"

import Image from "next/image"
import { Slide1, Text } from "ui"

import { LoadingSpinner } from "@/components/Snippet/LoadingSpinner"
import { useTokenBalances } from "@/hooks/useTokenBalances"
import { useTranslation } from "@/translations"

export const CryptoOnRampGuide = () => {
  const { noTokens } = useTranslation().translations.home
  const { isLoading } = useTokenBalances()

  if (isLoading) {
    return (
      <div className="flex-1 min-h-[200px] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center gap-4 pt-4 pb-12 filter grayscale">
      <Image src={Slide1} alt="" width={64} height={64} />
      <Text align="center" style="20-600" color="text-tertiary">
        {noTokens.title}
      </Text>
      <Text
        align="center"
        style="14-400"
        color="text-tertiary"
        className="whitespace-pre-line"
      >
        {noTokens.description}
      </Text>
    </div>
  )
}
