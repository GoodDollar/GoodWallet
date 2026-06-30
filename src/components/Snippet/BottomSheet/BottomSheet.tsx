import type React from "react"
import { type FC, useEffect, useState } from "react"
import { Button, Text } from "ui"

import styles from "./BottomSheet.module.css"

export type BottomSheetProps = {
  title?: string
  subtitle?: string
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  onBack?: () => void
  className?: string
}

export const BottomSheet: FC<BottomSheetProps> = ({
  children,
  isOpen,
  onClose,
  subtitle,
  title,
  onBack,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      document.body.style.overflow = "hidden"
      if (typeof window !== "undefined") {
        window.scrollTo(0, 0)
      }
    } else {
      // Delay hiding the bottom sheet to allow for animation matching the CSS transition duration
      const timeout = setTimeout(() => {
        setIsVisible(false)
        document.body.style.overflow = "auto"
      }, 400)
      return () => clearTimeout(timeout)
    }
  }, [isOpen])

  if (!isVisible) return null

  return (
    <div
      className={[
        styles.bottomSheet,
        isOpen ? styles.bottomSheetOpen : styles.bottomSheetClosed,
        className,
      ].join(" ")}
    >
      <div className={styles.bottomSheetBackground}>
        <div className={styles.bottomSheetContent}>
          {/* header */}
          <div className={styles.bottomSheetHeader}>
            {onBack && (
              <div className={styles.bottomSheetBackButton}>
                <Button
                  variant="icon"
                  icon="BsArrowLeft"
                  size="big"
                  onClick={onBack}
                />
              </div>
            )}

            <div className={styles.titleContainer}>
              {title && <Text style="18-600">{title}</Text>}
              {subtitle && (
                <Text style="14-400" color="white">
                  {subtitle}
                </Text>
              )}
            </div>

            <div className={styles.bottomSheetCloseButton}>
              <Button
                variant="icon"
                icon="BsXLg"
                size="big"
                onClick={onClose}
              />
            </div>
          </div>

          {/* body */}
          <div
            className={[styles.bottomSheetBody, styles.scrollbarHide].join(" ")}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
