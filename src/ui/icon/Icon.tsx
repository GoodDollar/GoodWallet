import { AllIcons, type IconName } from "../assets"
import styles from "./Icon.module.css"

export const SIZES = ["small", "big", "larger"] as const
export type Size = (typeof SIZES)[number]
export type IconSize = Size

export const ICON_COLORS = ["main", "white", "red", "inherit"] as const
export type IconColor = (typeof ICON_COLORS)[number]

export type { IconName }

const PX: Record<string, number> = {
  small: 12,
  default: 16,
  big: 24,
  larger: 35,
}

const isSvgSrc = (src?: string) => src?.split(/[?#]/)[0]?.endsWith(".svg")

export type IconProps = {
  name: IconName
  size?: Size
  color?: IconColor
  opacity?: "dim"
  round?: boolean
  spin?: boolean
}

export const Icon = ({
  name,
  size,
  color,
  opacity,
  round,
  spin,
}: IconProps) => {
  const px = PX[size ?? "default"]

  const cls = [
    styles[round ? "round" : "icon"],
    size && styles[size],
    color && styles[color],
    opacity && styles[opacity],
    spin && styles.spin,
  ]
    .filter(Boolean)
    .join(" ")

  const asset = AllIcons[name] || AllIcons.Questionmark

  let inner
  if (typeof asset === "function") {
    const Svg = asset
    inner = <Svg size={px} />
  } else if (isSvgSrc(asset.src) && color) {
    inner = (
      <span
        className={styles.maskedIcon}
        style={{
          maskImage: `url(${asset.src})`,
          WebkitMaskImage: `url(${asset.src})`,
        }}
      />
    )
  } else {
    // biome-ignore lint/performance/noImgElement: static SVG assets, no next/image needed
    inner = <img src={asset.src} alt="" width={px} height={px} />
  }

  return <span className={cls}>{inner}</span>
}

export const ALL_ICON_NAMES = (Object.keys(AllIcons) as IconName[]).sort()
