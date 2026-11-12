import type { ReactElement } from "react"

const WEB3AUTH_STATUS_UPDATES_URL = "https://ubi.gd/48e55xo"
const GOODDAPP_CLAIM_URL = "https://ubi.gd/3UU3Dgu"

// Opens in a new tab so the login screen stays in place; underlined to match the legal text links
function ExternalLink({
  href,
  children,
}: {
  href: string
  children: string
}): ReactElement {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline"
    >
      {children}
    </a>
  )
}

// Shown in place of the generic failed-login toast while Web3Auth is paused.
// Plain DOM text (no `translate="no"`) so browser translation applies like the rest of the wallet.
export function Web3AuthLoginUnavailableNotice(): ReactElement {
  return (
    <div className="flex flex-col gap-2 text-left text-sm">
      <strong>Login temporarily unavailable</strong>
      <p>
        Our login provider, Web3Auth, has paused its service after a security
        incident involving Keplr wallets. Your funds are safe. There&apos;s no
        restoration time yet. Follow the{" "}
        <ExternalLink href={WEB3AUTH_STATUS_UPDATES_URL}>
          Web3Auth status updates
        </ExternalLink>
        .
      </p>
      <p>
        Already logged in on another tab or device? Stay logged in. You can
        still use your wallet and claim G$.
      </p>
      <p>
        Imported your wallet into another app? You can{" "}
        <ExternalLink href={GOODDAPP_CLAIM_URL}>
          claim through GoodDapp
        </ExternalLink>
        .
      </p>
    </div>
  )
}
