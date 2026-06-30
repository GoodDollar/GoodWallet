import type { ISigner } from "@/login"
// https://github.com/satoshilabs/slips/blob/master/slip-0044.md
export const DerivationPaths: Record<keyof ISigner, string> = {
  // GOODWALLET uses index 1
  EVM: "m/44'/60'/0'/0/1",

  BTC: "m/44'/0'/0'/0/0",
  BTC_TESTNET: "m/44'/1'/0'/0/0",

  DOGE: "m/44'/3'/0'/0/0",
  DOGE_TESTNET: "m/44'/1'/0'/0/0",

  SOLANA: "m/44'/501'/0'/0'",
  SOLANA_DEVNET: "m/44'/503'/0'/0'",

  XRP: "m/44'/144'/0'/0'",
  XRP_TESTNET: "m/44'/1'/0'/0'",
}
