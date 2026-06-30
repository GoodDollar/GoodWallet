"use client"

import styles from "./Box.module.css"
import { useBoxScroll } from "./useBoxScroll"

type BoxProps = {
  children?: React.ReactNode
  vertical?: boolean
  align?: "center" | "start" | "end"
  space?: "between" | "around"
  gap?: "default" | "none" | "small" | "large"
  width?: "content" | "small" | "large"
  height?: "content" | "small" | "large"
  scroll?: boolean
  elevation?: "none" | "high" | "higher"
  padding?: "default" | "none" | "small" | "large"
  radius?: "default" | "none" | "small" | "large"
  selected?: boolean
  border?: "none" | "default" | "main"
  disabled?: boolean
  onClick?: () => void
  tabIndex?: number
}

export const Box = ({
  children,
  vertical,
  align = "center",
  space,
  elevation,
  gap,
  padding,
  radius,
  width,
  height,
  scroll,
  selected,
  border,
  disabled,
  onClick,
  tabIndex,
}: BoxProps) => {
  const { ref, dragging, dragHandlers } = useBoxScroll(
    scroll,
    vertical,
    selected,
  )

  const className = [
    styles.box,
    vertical ? styles.vertical : styles.horizontal,
    styles[align],
    space && styles[`space-${space}`],
    elevation && styles[`elevation-${elevation}`],
    padding && styles[`padding-${padding}`],
    radius && styles[`radius-${radius}`],
    gap && styles[`gap-${gap}`],
    width ? styles[`width-${width}`] : styles.full,
    height && styles[`height-${height}`],
    scroll && (vertical ? styles["scroll-y"] : styles["scroll-x"]),
    selected && styles.selected,
    (border || selected) && styles[`border-${border ?? "main"}`],
    disabled && styles.disabled,
    onClick && styles.clickable,
    dragging && styles.dragging,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div
      ref={ref}
      className={className}
      onClick={onClick}
      tabIndex={tabIndex}
      {...dragHandlers}
    >
      {children}
    </div>
  )
}
