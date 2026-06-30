"use client"
import { useEffect, useState } from "react"
import Image, { type ImageProps } from "next/image"
import type { ChainId } from "@lifi/sdk"
import { ChainIcons, Icon } from "ui"

import { getChainIcon } from "../Typo/ChainIcon"
import styles from "./TokenLogo.module.css"

type TokenLogoProps = {
  chainId: ChainId
  address: string
  showChainBadge?: boolean
} & Pick<ImageProps, "width" | "height" | "alt" | "style">

export const TokenLogo = ({
  showChainBadge = true,
  chainId,
  address,
  width,
  height,
  alt,
  style,
}: TokenLogoProps) => {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
  }, [address, chainId])

  const imageWidth = Number(width ?? 32)
  const imageHeight = Number(height ?? 32)
  const imageSrc = `/api/tokens/${address}/${chainId}/logo`

  const chainIconName = getChainIcon(chainId)
  const chainIconSrc =
    chainIconName in ChainIcons
      ? ChainIcons[chainIconName as keyof typeof ChainIcons]
      : null

  return (
    <div className={styles.wrapper}>
      {imageError ? (
        <Icon name="Questionmark" size="big" />
      ) : (
        <Image
          className={imageLoaded ? styles.tokenImage : styles.tokenImageLoading}
          style={style}
          src={imageSrc}
          alt={alt ?? ""}
          unoptimized
          width={imageWidth}
          height={imageHeight}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}
      {showChainBadge && chainIconSrc && (
        <div className={styles.badge}>
          <Image
            src={chainIconSrc}
            alt={`chain ${chainId}`}
            width={15}
            height={15}
            className={styles.badgeImage}
            unoptimized
          />
        </div>
      )}
    </div>
  )
}
