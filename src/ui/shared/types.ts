// =============================================================================
// SEMANTIC COLORS
// =============================================================================

export const COLORS = [
  "primary",
  "secondary",
  "gradient",
  "error",
  "warning",
  "success",
  "info",
  "muted",
] as const
export type Color = (typeof COLORS)[number]

// =============================================================================
// SIZE SCALES
// =============================================================================

// Spacing (gap, padding) - maps to --token-space-*
export const SPACES = [
  "none",
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
] as const
export type Space = (typeof SPACES)[number]

// Component sizes (buttons, inputs)
export const SIZES = ["xs", "sm", "md", "lg", "xl"] as const
export type Size = (typeof SIZES)[number]

// Icon sizes - extended scale
export const ICON_SIZES = ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"] as const
export type IconSize = (typeof ICON_SIZES)[number]

// Text sizes
export const TEXT_SIZES = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"] as const
export type TextSize = (typeof TEXT_SIZES)[number]

// =============================================================================
// TEXT-SPECIFIC
// =============================================================================

export const TEXT_COLORS = [
  "main",
  "soft",
  "muted",
  "dim",
  "primary",
  "secondary",
  "gradient",
  "error",
  "warning",
  "success",
  "info",
  "inherit",
] as const
export type TextColor = (typeof TEXT_COLORS)[number]

export const WEIGHTS = ["normal", "medium", "semibold", "bold"] as const
export type Weight = (typeof WEIGHTS)[number]

// =============================================================================
// LAYOUT
// =============================================================================

export const ALIGNS = ["start", "center", "end", "stretch", "baseline"] as const
export type Align = (typeof ALIGNS)[number]

export const JUSTIFIES = [
  "start",
  "center",
  "end",
  "between",
  "around",
  "evenly",
] as const
export type Justify = (typeof JUSTIFIES)[number]

export const RADII = ["none", "sm", "md", "lg", "xl", "full"] as const
export type Radius = (typeof RADII)[number]

export const DIRECTIONS = ["row", "column"] as const
export type Direction = (typeof DIRECTIONS)[number]

export const OVERFLOWS = ["visible", "hidden", "auto", "scroll"] as const
export type Overflow = (typeof OVERFLOWS)[number]

export const POSITIONS = ["relative", "absolute", "fixed", "sticky"] as const
export type Position = (typeof POSITIONS)[number]

// =============================================================================
// THEME
// =============================================================================

export const THEMES = ["blue", "green"] as const
export type Theme = (typeof THEMES)[number]

export type ThemeProps = {
  theme?: Theme
}

/** Returns CSS class for theme prop */
export const getThemeClass = (theme?: Theme): string =>
  theme ? `token-theme-${theme}` : ""

// =============================================================================
// COMPONENT-SPECIFIC
// =============================================================================

// Button variants
export const BUTTON_VARIANTS = [
  "solid",
  "outline",
  "ghost",
  "round",
  "list",
] as const
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number]

// Divider colors (extends Color with "border")
export const DIVIDER_COLORS = [
  "muted",
  "border",
  "primary",
  "gradient",
] as const
export type DividerColor = (typeof DIVIDER_COLORS)[number]

// Icon animations
export const ANIMATIONS = ["spinning"] as const
export type Animation = (typeof ANIMATIONS)[number]

// Text alignments
export const TEXT_ALIGNS = ["left", "center", "right"] as const
export type TextAlign = (typeof TEXT_ALIGNS)[number]

// Text elements
export const TEXT_ELEMENTS = [
  "span",
  "p",
  "div",
  "label",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
] as const
export type TextElement = (typeof TEXT_ELEMENTS)[number]

// Box elements
export const BOX_ELEMENTS = [
  "div",
  "span",
  "section",
  "article",
  "aside",
  "main",
  "nav",
  "header",
  "footer",
  "label",
] as const
export type BoxElement = (typeof BOX_ELEMENTS)[number]

// Dimension keywords
export const DIMENSION_KEYWORDS = [
  "auto",
  "full",
  "screen",
  "fit",
  "min",
  "max",
] as const
export type DimensionKeyword = (typeof DIMENSION_KEYWORDS)[number]

// Dimension sizes (maps to --token-size-*)
export const DIMENSION_SIZES = [
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
] as const
export type DimensionSize = (typeof DIMENSION_SIZES)[number]

export type Dimension = DimensionSize | DimensionKeyword
