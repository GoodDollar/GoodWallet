type Props = {
  text?: string
  size?: number
}

export const LoadingSpinner = ({ text, size = 80 }: Props) => (
  <div className="h-full flex items-center justify-center overflow-hidden">
    <div role="status">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
        width={size}
        height={size}
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="var(--main-muted)"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M12 3a9 9 0 0 1 9 9"
          stroke="var(--main)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
    {text && <div className="ml-5">{text}</div>}
  </div>
)
