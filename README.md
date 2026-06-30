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
