import type { IconSize, Size, TextSize, Weight } from "./types"

// Icon size → pixels
export const ICON_PX: Record<IconSize, number> = {
  "2xs": 12,
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
  "2xl": 64,
}

// Text size → pixels
export const TEXT_PX: Record<TextSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
}

// Component height → pixels (buttons, inputs)
export const SIZE_HEIGHT: Record<Size, number> = {
  xs: 24,
  sm: 32,
  md: 44,
  lg: 48,
  xl: 80,
}

// Round button diameter
export const ROUND_SIZE: Record<Size, number> = {
  xs: 32,
  sm: 40,
  md: 56,
  lg: 80,
  xl: 160,
}

// Size → appropriate icon size
export const SIZE_TO_ICON: Record<Size, IconSize> = {
  xs: "2xs",
  sm: "xs",
  md: "sm",
  lg: "md",
  xl: "lg",
}

// Size → appropriate text size
export const SIZE_TO_TEXT: Record<Size, TextSize> = {
  xs: "xs",
  sm: "sm",
  md: "sm",
  lg: "md",
  xl: "lg",
}

// Weight → numeric value
export const WEIGHT_VALUE: Record<Weight, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
}
