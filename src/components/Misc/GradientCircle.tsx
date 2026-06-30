import type React from "react"

interface GradientCircleProps {
  text: string
}

export const GradientCircle: React.FC<GradientCircleProps> = ({ text }) => {
  return (
    <div
      className="flex-center rounded-full w-12 h-12"
      style={{ background: "var(--brand-gradient)" }}
    >
      {text}
    </div>
  )
}
