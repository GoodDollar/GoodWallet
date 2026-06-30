import { cn } from "../utils/classNames.ts"

type BadgeVariant = "buy" | "sell" | "closed" | "default"

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  buy: "bg-[var(--palette-green-muted)] text-[var(--color-success)] border border-[var(--color-success)]",
  sell: "bg-[var(--token-error-muted)] text-[var(--color-error)] border border-[var(--token-error-muted)]",
  closed: "bg-[var(--token-error-muted)] text-[var(--color-error)]",
  default: "bg-[var(--brand-primary-muted)] text-[var(--brand-primary)]",
}

export default function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "px-3 py-1 rounded text-xs font-bold",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
