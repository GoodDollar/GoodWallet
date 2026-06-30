import {
  BITCOIN_CHAIN_ID,
  BITCOIN_TESTNET_CHAIN_ID,
  CELO_CHAIN_ID,
  DOGE_CHAIN_ID,
  DOGE_TESTNET_CHAIN_ID,
  ETHEREUM_CHAIN_ID,
  FUSE_CHAIN_ID,
  HOODI_CHAIN_ID,
  SEPOLIA_CHAIN_ID,
  SOLANA_CHAIN_ID,
  SOLANA_DEVNET_CHAIN_ID,
  XDC_CHAIN_ID,
  XRP_CHAIN_ID,
  XRP_TESTNET_CHAIN_ID,
} from "@/chain/chain-ids"
import {
  BITCOIN_NATIVE_ADDRESS,
  DOGE_NATIVE_ADDRESS,
  SOLANA_NATIVE_ADDRESS,
  XRP_NATIVE_ADDRESS,
  ZERO_ADDRESS,
} from "@/ethers-utils"
import { NormalizedAddressMap } from "@/hooks/useTokenBalances/NormalizedAddressMap"
import type { TokenInfo } from "@/tokens/types"

type ChainId = number
type Address = string
type Token = TokenInfo & { priceUSD?: string }

const ethFallbackTokens = new NormalizedAddressMap("EVM", [
  [
    ZERO_ADDRESS,
    {
      symbol: "ETH",
      decimals: 18,
      name: "ETH",
      logoURI:
        "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
    },
  ],
  [
    "0x67C5870b4A41D4Ebef24d2456547A03F1f3e094B",
    {
      symbol: "G$",
      decimals: 2,
      name: "GoodDollar",
      logoURI:
        "https://static.debank.com/image/fuse_token/logo_url/0x495d133b938596c9984d462f007b676bdc57ecec/9c4d096f43ca141571deb30794e69b77.png",
    },
  ],
  [
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    {
      symbol: "WETH",
      decimals: 18,
      name: "WETH",
      logoURI:
        "https://static.debank.com/image/eth_token/logo_url/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2/61844453e63cf81301f845d7864236f6.png",
    },
  ],
  [
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    {
      symbol: "USDC",
      decimals: 6,
      name: "USD Coin",
      logoURI:
        "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
    },
  ],
  [
    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    {
      symbol: "USDT",
      decimals: 18,
      name: "USDT",
      logoURI:
        "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png",
    },
  ],
  [
    "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    {
      symbol: "DAI",
      decimals: 18,
      name: "DAI Stablecoin",
      logoURI:
        "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png",
    },
  ],
  [
    "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
    {
      symbol: "SHIB",
      decimals: 18,
      name: "SHIBA INU",
      logoURI: "https://i.ibb.co/bQqBbSH/shib-logo.png",
    },
  ],
])

const fuseFallbackTokens = new NormalizedAddressMap("EVM", [
  [
    ZERO_ADDRESS,
    {
      symbol: "FUSE",
      decimals: 18,
      name: "FUSE",
      logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/5634.png",
    },
  ],
  [
    "0x79BeecC4b165Ccf547662cB4f7C0e83b3796E5b3",
    {
      symbol: "G$ Dev",
      decimals: 2,
      name: "GoodDollar Dev",
    },
  ],
  [
    "0x495d133B938596C9984d462F007B676bDc57eCEC",
    {
      symbol: "G$",
      decimals: 2,
      name: "GoodDollar",
      logoURI:
        "https://static.debank.com/image/fuse_token/logo_url/0x495d133b938596c9984d462f007b676bdc57ecec/9c4d096f43ca141571deb30794e69b77.png",
    },
  ],
])

//See https://github.com/Ubeswap/default-token-list/blob/master/ubeswap.token-list.json
const celoFallbackTokens = new NormalizedAddressMap("EVM", [
  [
    ZERO_ADDRESS,
    {
      symbol: "CELO",
      decimals: 18,
      name: "CELO",
      logoURI: "https://celoscan.io/token/images/celonativeasset_32.png",
    },
  ],
  [
    "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A",
    {
      symbol: "G$",
      decimals: 18,
      name: "GoodDollar",
      priceUSD: "0.000085",
      logoURI:
        "https://static.debank.com/image/fuse_token/logo_url/0x495d133b938596c9984d462f007b676bdc57ecec/9c4d096f43ca141571deb30794e69b77.png",
    },
  ],
  [
    "0xFa51eFDc0910CCdA91732e6806912Fa12e2FD475",
    {
      symbol: "G$ Dev",
      decimals: 18,
      name: "GoodDollar Dev",
    },
  ],
  [
    "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    {
      symbol: "cUSD",
      name: "Celo Dollar",
      decimals: 18,
      logoURI:
        "https://raw.githubusercontent.com/ubeswap/default-token-list/master/assets/asset_cUSD.png",
    },
  ],
  [
    "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
    {
      symbol: "cEUR",
      name: "Celo Euro",
      decimals: 18,
      logoURI:
        "https://raw.githubusercontent.com/ubeswap/default-token-list/master/assets/asset_cEUR.png",
    },
  ],
  [
    "0x27cd006548dF7C8c8e9fdc4A67fa05C2E3CA5CF9",
    {
      symbol: "PLASTIK",
      name: "PLASTIK Token",
      decimals: 9,
      logoURI:
        "https://raw.githubusercontent.com/ubeswap/default-token-list/master/assets/asset_PLASTIK.png",
    },
  ],
])

const xdcFallbackTokens = new NormalizedAddressMap("EVM", [
  [
    "0xA13625A72Aef90645CfCe34e25c114629d7855e7",
    {
      symbol: "G$ Dev",
      decimals: 18,
      name: "GoodDollar Dev",
    },
  ],
  [
    "0xEC2136843a983885AebF2feB3931F73A8eBEe50c",
    {
      symbol: "G$",
      decimals: 18,
      name: "GoodDollar",
      logoURI:
        "https://static.debank.com/image/fuse_token/logo_url/0x495d133b938596c9984d462f007b676bdc57ecec/9c4d096f43ca141571deb30794e69b77.png",
    },
  ],
])

const sepoliaFallbackTokens = new NormalizedAddressMap("EVM", [
  [
    ZERO_ADDRESS,
    {
      symbol: "ETH",
      decimals: 18,
      name: "Sepolia",
      logoURI:
        "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
    },
  ],
  [
    "0x699cFE8997d647D03325Ef4bfD039d5bB0984A17",
    {
      symbol: "MPT",
      decimals: 18,
      name: "MoonPay Token",
      logoURI:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSbx8UcJhmp9gc40I33eD1NvxU2qBYidXZxBQ&s",
    },
  ],
])

const hoodiFallbackTokens = new NormalizedAddressMap("EVM", [
  [
    ZERO_ADDRESS,
    {
      symbol: "ETH",
      decimals: 18,
      name: "Hoodi",
      logoURI:
        "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
    },
  ],
])

const bitcoinFallbackTokens = new NormalizedAddressMap("BTC", [
  [
    BITCOIN_NATIVE_ADDRESS,
    {
      symbol: "BTC",
      decimals: 8,
      name: "Bitcoin",
      logoURI:
        "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png",
    },
  ],
])

const bitcoinTestnetFallbackTokens = new NormalizedAddressMap("BTC_TESTNET", [
  [
    BITCOIN_NATIVE_ADDRESS,
    {
      symbol: "BTC",
      decimals: 8,
      name: "Bitcoin Testnet",
      logoURI:
        "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png",
    },
  ],
])

const dogeFallbackTokens = new NormalizedAddressMap("DOGE", [
  [
    DOGE_NATIVE_ADDRESS,
    {
      symbol: "DOGE",
      decimals: 8,
      name: "Doge",
      logoURI:
        "https://banner2.cleanpng.com/20180904/fpf/kisspng-dogecoin-portable-network-graphics-cryptocurrency-1713944262820.webp",
    },
  ],
])
const dogeTestnetFallbackTokens = new NormalizedAddressMap("DOGE_TESTNET", [
  [
    DOGE_NATIVE_ADDRESS,
    {
      symbol: "DOGE",
      decimals: 8,
      name: "Doge Testnet",
      logoURI:
        "https://banner2.cleanpng.com/20180904/fpf/kisspng-dogecoin-portable-network-graphics-cryptocurrency-1713944262820.webp",
    },
  ],
])

const solFallbackTokens = new NormalizedAddressMap("SOLANA", [
  [
    SOLANA_NATIVE_ADDRESS,
    {
      symbol: "SOL",
      decimals: 9,
      name: "Solana",
      logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png",
    },
  ],
])
const xrpFallbacktokens = new NormalizedAddressMap("XRP", [
  [
    XRP_NATIVE_ADDRESS,
    {
      symbol: "XRP",
      decimals: 6,
      name: "XRP",
      logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/52.png",
    },
  ],
])
const xrpTestnetFallbackTokens = new NormalizedAddressMap("XRP_TESTNET", [
  [
    XRP_NATIVE_ADDRESS,
    {
      symbol: "XRP",
      decimals: 6,
      name: "XRP Testnet",
      logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/52.png",
    },
  ],
])
const solDevnetFallbackTokens = new NormalizedAddressMap("SOLANA_DEVNET", [
  [
    SOLANA_NATIVE_ADDRESS,
    {
      symbol: "SOL",
      decimals: 9,
      name: "Solana Devnet",
      logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png",
    },
  ],
  [
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    {
      symbol: "USDC",
      decimals: 6,
      name: "USDC on Solana Devnet",
      logoURI:
        "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU/logo.png",
    },
  ],
  [
    "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr",
    {
      symbol: "EURC",
      decimals: 6,
      name: "EURC on Solana Devnet",
      logoURI: "https://www.circle.com/hubfs/Brand/EURC/EURC-icon_128x128.png",
    },
  ],
])

export const FALLBACK_TOKENS = new Map<
  ChainId,
  NormalizedAddressMap<Address, Token>
>([
  [ETHEREUM_CHAIN_ID, ethFallbackTokens],
  [FUSE_CHAIN_ID, fuseFallbackTokens],
  [CELO_CHAIN_ID, celoFallbackTokens],
  [XDC_CHAIN_ID, xdcFallbackTokens],
  [SEPOLIA_CHAIN_ID, sepoliaFallbackTokens],
  [HOODI_CHAIN_ID, hoodiFallbackTokens],
  [BITCOIN_CHAIN_ID, bitcoinFallbackTokens],
  [BITCOIN_TESTNET_CHAIN_ID, bitcoinTestnetFallbackTokens],
  [DOGE_CHAIN_ID, dogeFallbackTokens],
  [DOGE_TESTNET_CHAIN_ID, dogeTestnetFallbackTokens],
  [SOLANA_CHAIN_ID, solFallbackTokens],
  [SOLANA_DEVNET_CHAIN_ID, solDevnetFallbackTokens],
  [XRP_CHAIN_ID, xrpFallbacktokens],
  [XRP_TESTNET_CHAIN_ID, xrpTestnetFallbackTokens],
])
