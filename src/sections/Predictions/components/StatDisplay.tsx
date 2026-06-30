import { cn } from "../utils/classNames.ts"

interface StatDisplayProps {
  label: string
  value: string | number
  highlight?: boolean
  highlightColor?: "green" | "red"
}

export default function StatDisplay({
  label,
  value,
  highlight = false,
  highlightColor = "green",
}: StatDisplayProps) {
  return (
    <div>
      <p className="text-white/60 text-xs mb-1">{label}</p>
      <p
        className={cn(
          "font-medium",
          highlight &&
            highlightColor === "green" &&
            "text-[var(--color-success)]",
          highlight && highlightColor === "red" && "text-[var(--color-error)]",
        )}
      >
        {value}
      </p>
    </div>
  )
}
