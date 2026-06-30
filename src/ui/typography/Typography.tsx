import type { ReactNode } from "react"

import styles from "./Typography.module.css"

// Semantic color tokens - aligned with style.css design system
export type ThemeColor =
  | "brand"
  | "white"
  | "error"
  | "warning"
  | "info"
  | "text-soft"
  | "text-secondary"
  | "text-tertiary"
  | `--${string}` // Allow any CSS variable

const getColorVar = (c: ThemeColor | string): string => {
  // If it's already a CSS variable, use it directly
  if (c.startsWith("--")) {
    return `var(${c})`
  }

  // Map semantic names to CSS variables
  switch (c) {
    // Primary semantic tokens
    case "brand":
      return "var(--brand-primary)"
    case "white":
      return "var(--text-main)"
    case "error":
      return "var(--color-error)"
    case "warning":
      return "var(--color-warning)"
    case "info":
      return "var(--color-info)"
    case "text-soft":
      return "var(--text-soft)"
    case "text-secondary":
      return "var(--text-secondary)"
    case "text-tertiary":
      return "var(--text-tertiary)"

    default:
      // Fallback to --color-{name} for any other values
      return `var(--color-${c})`
  }
}

export default function Typography(props: {
  children: ReactNode
  el?: "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  style?:
    | "12-400"
    | "12-600"
    | "14-400"
    | "14-600"
    | "16-400"
    | "16-600"
    | "18-600"
    | "20-600"
    | "24-600"
    | "48-400"
    | "48-600"
  color?: ThemeColor
  align?: "left" | "center" | "right"
  truncate?: boolean
  noWrap?: boolean
  className?: string
}) {
  const Element = props.el ?? "span"
  const [size, weight] = props.style?.split("-") ?? ["14", "400"]

  const fontSize = size + "px"
  const fontWeight = weight ?? "400"
  const color = getColorVar(props.color ?? "white")
  const textAlign = props.align ?? "left"
  const whiteSpace = props.noWrap ? "nowrap" : ""

  const text = (
    <Element
      className={[
        styles.text,
        props.truncate ? styles.truncate : "",
        props.className || "",
      ].join(" ")}
      style={{ color, fontSize, fontWeight, textAlign, whiteSpace }}
    >
      {props.children}
    </Element>
  )

  const truncate = (
    <div className={styles.table}>
      <div className={styles.cell}>{text}</div>
    </div>
  )

  return props.truncate ? truncate : text
}
