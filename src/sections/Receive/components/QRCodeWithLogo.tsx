"use client"

import type React from "react"
import { useMemo } from "react"
import { QRCodeSVG } from "qrcode.react"

export type QRCodeWithLogoProps = {
  value: string
  logo: string
  style?: React.CSSProperties
}

export const QRCodeWithLogo: React.FC<QRCodeWithLogoProps> = ({
  value,
  logo,
  style,
}) => {
  const settings = useMemo(
    () => ({
      src: logo,
      height: 24,
      width: 24,
      excavate: true,
    }),
    [logo],
  )

  return (
    <QRCodeSVG
      value={value}
      size={200}
      includeMargin={true}
      imageSettings={settings}
      style={style}
    />
  )
}
