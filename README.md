# GoodWallet V2 – Technical Design Document

## 1. Project Overview

GoodWallet V2 is a multi-chain, multi-protocol crypto wallet built on Next.js 16. It spans EVM chains plus Solana, Bitcoin, Dogecoin and XRP, with token management via Alchemy, cross-chain swaps via Li.Fi, prediction-market trading via Polymarket, and WalletConnect (Reown) connectivity. It centers on the GoodDollar (G$) UBI ecosystem.

## 2. Core Features

- **Multi-Chain Support**
  EVM (Ethereum, Fuse, Celo, Polygon, BNB Chain, Optimism, Base, XDC) plus Solana, Bitcoin, Dogecoin, and XRP
- **Token Management**
  Alchemy-based balance tracking, send/receive, QR code transactions, gasless mode
- **Swaps**
  Cross-chain and same-chain swaps via Li.Fi (EVM, Solana, Bitcoin providers)
- **Predictions / Trading**
  Polymarket prediction markets with on-chain trading and live charts
- **GoodDollar Ecosystem**
  UBI claims, identity/whitelisting, faucet, referrals
- **Authentication**
  Web3Auth/Torus (Google, Facebook, Private Key) and Auth0 passwordless
- **Monitoring & Analytics**
  Sentry for error tracking, Amplitude for user analytics

## 3. Technical Stack

- **Frontend**: Next.js 16 App Router, React 19, TypeScript
- **Blockchain**: Ethers.js + Viem, bitcoinjs-lib, gill/Solana, xrpl, Alchemy, custom RPCs
- **State Management**: Valtio, SWR
- **Database**: Drizzle ORM over Neon (Postgres) and PGlite (local token cache)
- **Styling**: Tailwind CSS, CSS Modules

## 4. Key Integrations

- **Swaps & Bridging**: Li.Fi SDK v4
- **Multi-chain Data**: Alchemy, Tatum
- **Connectivity**: WalletConnect v2 via Reown WalletKit
- **Predictions**: Polymarket CLOB / builder-relayer clients
- **Authentication**: Web3Auth/Torus social logins, Auth0 passwordless (hCaptcha)
- **Analytics**: Sentry, Amplitude

## 5. Components & Architecture

- **Wallet Infrastructure**
  Multi-chain balances, token management, gas estimation, gasless transactions
- **UI Components**
  Drawers, modals, toasts, QR scanner, charts, reusable forms
- **GoodDollar**
  UBI claims, identity verification, multi-chain G$ support
- **Project Structure**
  `/src/app` (App Router, `[locale]` routes, `/api`), `/src/sections` (feature flows: Home, Send, Receive, Swap, Predictions, GoodDollar, Login, WalletConnect, Qr, Options), `/src/chain`, `/src/tokens`, `/src/stores`, `/src/hooks`, `/src/components`, `/src/ui`

## 6. Development Tools

- Biome (lint + format), Lefthook (git hooks)
- Vitest for tests
- Drizzle Kit for schema/migrations
- TypeScript for type safety

## 7. Environment Support

- **PWA Capabilities**: installable on mobile and desktop
- **Internationalization**: i18n routing with `[locale]` directories
- **Cross-Browser & Cross-Platform**: consistent experience on major browsers

## 8. Requirements & Running

- Node.js 22+
- Yarn 4.x
- A configured environment file. Copy `.env.example` to `.env.development`
  (or `.env.production`) and fill in real values:

  ```sh
  cp .env.example .env.development
  ```

  `.env.development` and `.env.production` are gitignored — never commit real
  secrets. Variables prefixed `NEXT_PUBLIC_` are inlined into the client bundle
  and must be treated as public; everything else is server-only.

To install dependencies, run:

```sh
yarn install
```

To start the development server (runs `drizzle-kit push`, then `next dev`):

```sh
yarn dev
```

Other scripts: `yarn build`, `yarn start`, `yarn test`, `yarn lint`.

Then open http://localhost:3000 in your browser

## 9. Playwright browser tests (contributor guide)

Playwright runs a deterministic, credential-free browser suite that captures the
initial GoodWallet journeys in Chromium for desktop and mobile viewports. The
suite is defined by the [Automated Playwright and Screenshot Flow plan](../issues/38)
and the contributor scope in issue #40.

### Install

After the normal `yarn install`, the suite also needs a Chromium build:

```sh
yarn playwright install chromium
```

The Playwright config (`playwright.config.ts`) generates a fresh wallet seed per
run, disables Google/Facebook/pwless login, blocks non-local browser traffic,
and stubs `/api/tokens`. No production secrets, real wallets, real funds, or
live transactions are required or reachable.

### Run

| Command | Purpose |
| --- | --- |
| `yarn test:e2e` | Run the full Playwright suite (desktop + mobile). |
| `yarn test:e2e:screenshots` | Run only the approved screenshot flows. |
| `yarn test:e2e:headed` | Run with a visible browser window. |
| `yarn test:e2e:debug` | Run with Playwright Inspector. |
| `yarn test` | Run Vitest unit tests (must stay green). |
| `yarn biome:verify:all` | Biome lint + format check (must stay green). |

### Test-mode environment boundaries

`NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE=true` enables the deterministic UI states used
by the suite. While the flag is on:

- The wallet seed is generated at config load time; no real key material is ever
  exposed to the browser.
- `/api/tokens` is stubbed by the route handler in `tests-playwright/wallet-flows.e2e.ts`.
- All non-local requests are aborted at the browser boundary.
- The GoodDollar claim screen renders the verification-required state without
  touching the live claim flow.

The flag is scoped to the Playwright web server. Production builds never set
it. Do not enable it in `yarn dev` for normal development.

### Screenshot layout

Screenshots are written under a flow directory using semantic state names:

```
tests-playwright/<page-or-flow>/screenshot-<state>-<viewport>.png
```

For example, `tests-playwright/home/screenshot-home-balances-overflow-en-mobile.png`.
Run artifacts (traces, videos, logs, HTML reports) live under
`tests-playwright/artifacts/`, `playwright-report/`, and `test-results/` — all
gitignored.

### Adding a flow

1. Add a new `.e2e.ts` file under `tests-playwright/` whose filename ends with
   `.e2e.ts` (Playwright's `testMatch` glob).
2. Use the existing `preparePage` and `login` helpers to keep the test
   credential-free and deterministic.
3. Use semantic, user-facing locators (`getByRole`, `getByText`, `getByTestId`)
   instead of CSS selectors.
4. Capture screenshots with the `screenshotPath(flow, state, project)` helper so
   the file lands under the right flow directory.
5. Add a matching `yarn test:e2e:screenshots` description if the screenshot is
   intended to be committed as a baseline.

### Playwright baselines

Approved baseline screenshots are the only Playwright outputs that should ever
be committed. Anything else stays untracked through `.gitignore`. To update an
intentional baseline:

1. Generate the new screenshot with the existing flow (the suite does not use
   Playwright snapshot assertions, so there is no `--update-snapshots` flag
   shortcut — see `yarn test:e2e:update-baselines`).
2. Move or rename the produced file into the correct flow directory using the
   `screenshot-<state>-<viewport>.png` pattern.
3. Open a PR that includes only the baseline change plus a description of the
   visual diff in the PR body. The reviewer owns the intentional baseline
   approval.

The previous `test:e2e:screenshots` script invoked
`playwright test --update-snapshots`, but the suite has no snapshot assertion
to update. That misleading command has been replaced.

### Failure triage

- **Browser cannot start**: rerun `yarn playwright install chromium`.
- **`SyntaxError: Unexpected token 'e'` in the browser console**: the local
  storage seed for `defaultLoginMethod` is missing its JSON quoting. The
  helper in `wallet-flows.e2e.ts` already wraps it in `JSON.stringify`; rerun
  `yarn install --immutable` to refresh the dependency lock.
- **Flaky readiness**: use `await expect(...).toBeVisible()` instead of
  `waitForTimeout`. The suite is configured with `fullyParallel: false` and
  `workers: 1` so timing is deterministic.
- **CI agent-triggered run**: the `.github/workflows/playwright-agent.yml`
  workflow is intentionally `workflow_dispatch` only — it is never run
  automatically on every PR. A reviewer or contributor can launch it from
  the Actions tab to upload screenshots, traces, videos, and logs. The
  full YAML is also reproduced in the PR description so a maintainer can
  paste it back into `.github/workflows/` if any account-level push rule
  blocks the workflow file itself.
