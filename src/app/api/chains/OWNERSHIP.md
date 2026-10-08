# Blockchain API ownership authentication

## Deployment

- Set `API_POW_SESSION_SECRET` to an independently generated random server-only secret of at least 32 characters. Use the same value on all instances. Rotating it invalidates all challenges and sessions.
- Set `API_OWNERSHIP_ORIGIN` to the exact canonical app origin, without a trailing slash (HTTPS in production). Each preview deployment needs its own configured origin. Development defaults to `http://localhost:3000`.
- No shared nonce storage is required. Existing per-instance IP rate limits are **not distributed protection**; use a shared limiter or WAF for production quota protection.

## Protocol v2

The server HMAC-signs a five-minute challenge containing family, address, audience, timestamp and PoW difficulty. The client validates these fields, signs a domain-separated authentication message containing the challenge with that address's signer, and solves the SHA-256 PoW. The POST endpoint verifies all three proofs before issuing an HttpOnly cookie.

Cookies are scoped to family/address and expire 30 minutes after the original challenge timestamp. A replay within the five-minute challenge window produces the same session token and expiration, never a fresh lifetime. This is time-bounded authentication, not a single-use protocol; there is no individual revocation without state. Old PoW-only cookies are rejected by the v2 token types and cookie names.

EVM uses personal-message signing, Solana uses Ed25519 message signing, and XRP uses ripple-keypairs with public-key/address verification. BTC/DOGE use a GoodWallet-specific, domain-separated SHA-256/ECDSA authentication protocol with network-specific public-key/address derivation. This is not BIP-322 and does not sign transactions. Imported external BTC/DOGE/XRP signers must implement `signAuthMessage`; unsupported signers fail closed. External EVM wallets may prompt for authentication and contract-wallet signatures (EIP-1271) are not supported by this verifier.

## Scope and remaining limitations

- Balance/history/UTXO requests require an ownership cookie for the exact chain family and address.
- Non-verbose raw transaction requests require the address cookie, but the existing transaction handler does **not** verify that the hash belongs to the supplied address. This change authenticates the requesting address; it does not establish transaction association.
- Fee queries and verbose transaction confirmation queries retain their existing rate-limited, unauthenticated behavior. Counterparty name lookups and direct client RPC calls are unchanged.
- Authentication proves ownership, not use of the official UI. Maintain upstream budgets, rate limits and caching independently.

Run the isolated crypto/protocol tests with `yarn vitest run --config src/app/api/chains/ownershipSignature.vitest.config.ts`.