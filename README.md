# GoodWallet V2 – Technical Design Document

## 1. Project Overview

GoodWallet V2 is a multi-chain, multi-protocol crypto wallet built on Next.js 16. It spans EVM chains plus Solana, Bitcoin, Dogecoin and XRP, with token management via Alchemy, cross-chain swaps via Li.Fi, and WalletConnect (Reown) connectivity. It centers on the GoodDollar (G$) UBI ecosystem.

## 2. Core Features

- **Multi-Chain Support**
  EVM (Ethereum, Fuse, Celo, Polygon, BNB Chain, Optimism, Base, XDC) plus Solana, Bitcoin, Dogecoin, and XRP
- **Token Management**
  Alchemy-based balance tracking, send/receive, QR code transactions, gasless mode
- **Swaps**
  Cross-chain and same-chain swaps via Li.Fi (EVM, Solana, Bitcoin providers)
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
  `/src/app` (App Router, `[locale]` routes, `/api`), `/src/sections` (feature flows: Home, Send, Receive, Swap, GoodDollar, Login, WalletConnect, Qr, Options), `/src/chain`, `/src/tokens`, `/src/stores`, `/src/hooks`, `/src/components`, `/src/ui`

## 6. Development Tools

- Biome (lint + format), Lefthook (git hooks)
- Vitest for tests
- Drizzle Kit for schema/migrations
- TypeScript for type safety

## 7. Environment Support

- **PWA Capabilities**: installable on mobile and desktop
- **Internationalization**: i18n routing with `[locale]` directories
- **Cross-Browser & Cross-Platform**: consistent experience on major browsers

## 8. Local development

You need Node.js 22+ and Corepack or Yarn. The repository pins Yarn 4.17.0.

1. Install dependencies:

   ```sh
   corepack enable # if Yarn is not already available
   yarn install
   ```

   GoodWidget packages are installed from the package registry; a separate
   GoodWidget checkout is not required.

2. Create your local configuration, unless you already have one:

   ```sh
   cp .env.example-simple .env.development
   ```

   Edit `.env.development` for the features you want to use. Set RPC URLs for
   the chains you need, and configure Web3Auth and the corresponding provider
   credentials if using Google, Facebook, or passwordless login. GoodDollar
   contract environments are `development`, and `production`.
   The example uses a local PGlite database at `./data/local.db`.

   For a local test login without setting up an authentication provider, set:

   ```dotenv
   NEXT_PUBLIC_LOGIN_GOOGLE_ENABLED=false
   NEXT_PUBLIC_LOGIN_FACEBOOK_ENABLED=false
   NEXT_PUBLIC_LOGIN_PWLESS_ENABLED=false
   NEXT_PUBLIC_TEST_LOGIN_ENABLED=true
   NEXT_PUBLIC_TEST_LOGIN_MASTER_SEED=<64-character-hex-test-seed>
   NEXT_PUBLIC_TEST_LOGIN_USER_NAME=Local test wallet
   NEXT_PUBLIC_TEST_LOGIN_PROFILE_IMAGE=/icon.svg
   ```

   Generate a test seed with `openssl rand -hex 32`. This creates a real wallet
   seed exposed to the browser: use it only for a disposable test wallet and
   never fund it with assets of value. RPCs and provider API keys may still be
   needed for chain data and other integrations.

   `.env.development` is gitignored; keep credentials out of Git. Variables
   prefixed `NEXT_PUBLIC_` are visible to the browser. If you also have an
   `.env.local`, Next.js loads it with higher priority than `.env.development`.

3. Start the application:

   ```sh
   yarn dev
   ```

   This creates `data/`, applies the local PGlite schema with `drizzle-kit push`,
   and starts Next.js at http://localhost:3000. The database used by the app is
   selected separately by `POSTGRES_TOKENS_DATABASE_URL`; keep the example's
   `pglite://./data/local.db` to use the same local database.

Other useful commands: `yarn build`, `yarn start`, `yarn test`, and
`yarn biome:verify:all`.

### Testing an unreleased package

The normal setup installs published packages. To test an unreleased widget or
any other unreleased package, build and pack it in its source repository, then
temporarily point this project at the resulting tarball. For example, for a
package in the [GoodWidget](https://github.com/GoodDollar/GoodWidget) monorepo:

```sh
mkdir -p /path/to/GoodWallet/local-packages
pnpm --filter <package-name> pack --pack-destination /path/to/GoodWallet/local-packages
```

Follow the source repository's build instructions before packing. In GoodWallet,
update the package's `package.json` dependency to a local file reference such as
`"file:./local-packages/package.tgz"` (using the actual tarball name), then run
`yarn install`. Revert the dependency and lockfile changes when finished unless
they are intentionally part of your work. The `local-packages/*.tgz` archives
are gitignored.

## Vercel deployments

Vercel Git deployments are disabled in `vercel.json`. Pull requests targeting
`main` are handled by the Preview workflow and deployed as prebuilt Preview
artifacts after the checks pass. Pushes to `main` are handled by the main branch
workflow and deployed as prebuilt Preview artifacts. Pushes to `production` use
a separate release workflow with prebuilt Production deployment steps,
preserving the existing promotion-by-merge process without relying on Vercel
Git deployments. Domains remain managed by Vercel.

The repository needs these GitHub Actions secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## GoodWidget visibility

Widget routes are registered independently from dashboard buttons. For example,
setting `NEXT_PUBLIC_AI_CREDITS_WIDGET_DASHBOARD_ENABLED=true` shows the AI
Credits button; it is hidden when unset or set to `false`, while the authenticated
`/{locale}/ai-credits` path remains available. `NEXT_PUBLIC_*` values are read
during the Next.js build, so a Vercel environment change requires a new
deployment/redeploy.

The Superfluid button follows the same pattern with
`NEXT_PUBLIC_SUPERFLUID_CAMPAIGN_WIDGET_DASHBOARD_ENABLED`; its authenticated
`/{locale}/superfluid-campaign` path remains available when the button is hidden.

The Streaming button follows the same pattern with
`NEXT_PUBLIC_STREAMING_WIDGET_DASHBOARD_ENABLED`; its authenticated
`/{locale}/streaming` path remains available when the button is hidden.
