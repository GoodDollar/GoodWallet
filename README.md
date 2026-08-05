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

## Vercel deployments

Vercel Git deployments are disabled in `vercel.json`. Pull requests targeting
`main` are handled by the Preview workflow and deployed as prebuilt Preview
artifacts after the checks pass. Pushes to `main` are handled by the main branch
workflow and deployed as prebuilt Production artifacts. Pushes to `production`
use a separate release workflow with the same prebuilt Production deployment
steps, preserving the existing promotion-by-merge process without relying on
Vercel Git deployments. Domains remain managed by Vercel.

The repository needs these GitHub Actions secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## GoodWidget visibility

Widget routes are registered independently from dashboard buttons. For example,
setting `NEXT_PUBLIC_AI_CREDITS_WIDGET_DASHBOARD_ENABLED=false` hides the AI
Credits button while keeping the authenticated `/{locale}/ai-credits` path
available. `NEXT_PUBLIC_*` values are read during the Next.js build, so a Vercel
environment change requires a new deployment/redeploy.

## GoodWidget local-tarball workflow

Widget packages that are not yet published to npm (e.g. `@goodwidget/ai-credits-widget`)
must be installed from a local tarball built inside the
[GoodDollar/GoodWidget](https://github.com/GoodDollar/GoodWidget) monorepo.

1. Clone `GoodDollar/GoodWidget` alongside this repo.
2. Inside the GoodWidget monorepo, pack the widget:
   ```sh
   pnpm --filter @goodwidget/ai-credits-widget pack --pack-destination /path/to/GoodWallet/local-packages
   ```
3. The tarball lands at `local-packages/ai-credits-widget.tgz` (already referenced in `package.json`).
4. Run `yarn install` in this repo to link the tarball.
5. The path `local-packages/*.tgz` is git-ignored; do **not** commit tarballs.
