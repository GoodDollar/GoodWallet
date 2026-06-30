"use client"

import type { ComponentPropsWithoutRef } from "react"

import {
  type DividerColor,
  getThemeClass,
  SIZES,
  type Size,
  type Theme,
} from "../shared"
import styles from "./Divider.module.css"

export const DIVIDER_SIZES = SIZES
export type { DividerColor }
export type DividerSize = Size

export type DividerProps = Omit<ComponentPropsWithoutRef<"div">, "color"> & {
  theme?: Theme
  vertical?: boolean
  size?: Size
  color?: DividerColor
}

export const Divider = ({
  theme,
  vertical = false,
  size = "md",
  color = "border",
  className,
  ...rest
}: DividerProps) => {
  return (
    <div
      className={[
        styles.divider,
        getThemeClass(theme),
        styles[`size-${size}`],
        styles[`color-${color}`],
        vertical && styles.vertical,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  )
}

Divider.displayName = "Divider"
