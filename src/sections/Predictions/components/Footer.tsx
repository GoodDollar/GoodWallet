export default function Footer() {
  return (
    <footer
      className={"w-full py-6 text-center text-sm text-[var(--text-secondary)]"}
    >
      <a
        href="https://polymarket.com/tos"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-[var(--text-soft)] underline transition-colors"
      >
        Polymarket Terms of Service
      </a>
    </footer>
  )
}
