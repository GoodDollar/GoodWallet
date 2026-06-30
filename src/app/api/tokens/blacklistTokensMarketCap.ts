import {
  BASE_CHAIN_ID,
  BNB_CHAIN_ID,
  CELO_CHAIN_ID,
  ETHEREUM_CHAIN_ID,
  FUSE_CHAIN_ID,
  POLYGON_CHAIN_ID,
  SOLANA_CHAIN_ID,
} from "@/chain/chain-ids"
import { NormalizedAddressMap } from "@/hooks/useTokenBalances/NormalizedAddressMap"

const ethereumBlacklistTokensMarketcap = new NormalizedAddressMap("EVM", [
  ["0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2", {}],
  ["0xcc4ae94372da236e9b113132e0c46c68704246b9", {}],
  ["0xad3e3fc59dff318beceaab7d00eb4f68b1ecf195", {}],
  ["0x87cdc02f0812f08cd50f946793706fad9c265e2d", {}],
  ["0x65e3c4a750a2e7cc7cce86d01587bbcbbe99042e", {}],
  ["0x6dddf4111ad997a8c7be9b2e502aa476bf1f4251", {}],
  ["0xa6a21313fe2fc6a5cf1e293dcbf99d180865babc", {}],
  ["0x4b7ee45f30767f36f06f79b32bf1fca6f726deda", {}],
  ["0x17c090f9a17e4e5a8ceb23bbe7e7e28e3c4ca196", {}],
  ["0x83f798e925bcd4017eb265844fddabb448f1707d", {}],
  ["0xc0a25a24cce412e2fb407c08e3785437fee9ad1d", {}],
  ["0x17ac188e09a7890a1844e5e65471fe8b0ccfadf3", {}],
  ["0xe632ea2ef2cfd8fc4a2731c76f99078aef6a4b31", {}],
  ["0x9deb0fc809955b79c85e82918e8586d3b7d2695a", {}],
  ["0x99fe3b1391503a1bc1788051347a1324bff41452", {}],
  ["0xdcd13da7d48820c2bdb866e31fe085b56ccbcaf2", {}],
  ["0x8e964e35a76103af4c7d7318e1b1a82c682ae296", {}],
  ["0x9d79d5b61de59d882ce90125b18f74af650acb93", {}],
  ["0xb3b3c527ba57cd61648e2ec2f5e006a0b390a9f8", {}],
  ["0x34b13f8cd184f55d0bd4dd1fe6c07d46f245c7ed", {}],
  ["0xbf9e72eeb5adb8b558334c8672950b7a379d4266", {}],
  ["0x37d299d9900209c3566254cfe59bfe6ff8f8c295", {}],
  ["0xa3d58c4e56fedcae3a7c43a725aee9a71f0ece4e", {}],
  ["0x37e1160184f7dd29f00b78c050bf13224780b0b0", {}],
  ["0x95987b0cdc7f65d989a30b3b7132a38388c548eb", {}],
  ["0x341c05c0e9b33c0e38d64de76516b2ce970bb3be", {}],
  ["0xc8CF6D7991f15525488b2A83Df53468D682Ba4B0", {}],
])

const bnbBlacklistTokensMarketcap = new NormalizedAddressMap("EVM", [
  ["0x07145ad7c7351c6fe86b6b841fc9bed74eb475a7", {}],
])

const fuseBlacklistTokensMarketcap = new NormalizedAddressMap("EVM", [
  ["0x8bf40e191ac82bc09d946629655a6b8baf8f063e", {}],
])

const polygonBlacklistTokensMarketcap = new NormalizedAddressMap("EVM", [
  ["0x9377eeb7419486fd4d485671d50baa4bf77c2222", {}],
  ["0x42435f467d33e5c4146a4e8893976ef12bbce762", {}],
  ["0x2e12d38c6aa87cb68ce96c044b9a68dd98233ceb", {}],
  ["0x92e918ea7aa872f91bf7ec9bcd248a5920c9f3cb", {}],
  ["0x1581929770be3275a82068c1135b6dd59c5334ed", {}],
  ["0xe38eb5a707d9a09757246dc37df11b35e47ba782", {}],

  ["0x176f5ab638cf4ff3b6239ba609c3fadaa46ef5b0", {}],
  ["0x25efae7b0b2866cafb14e8ead333a42eeb2a0b80", {}],
  ["0x4d08ef733cf27b4cd37810cf9b72a82d2a135549", {}],

  ["0x5cc8d49984834314f54211b1d872318cf766d466", {}],
  ["0x36de20a30386b5bf99762e4b7e62f6a28dcea3ae", {}],
  ["0x12919a30447ff59947740507362a05b8bea9a6e7", {}],
  ["0x160d64f91ad7c4d9ac4ba2c44a0e77373ca69ebe", {}],
])

const baseBlacklistTokensMarketcap = new NormalizedAddressMap("EVM", [
  ["0x2f85d372bef829e866f8917378ff20a88e7fc403", {}],
  ["0x93742224fa8fc7589453ebf7a3fa893ee7d4c6fb", {}],
  ["0xbefd5c25a59ef2c1316c5a4944931171f30cd3e4", {}],
])

const celoBlacklistTokensMarketcap = new NormalizedAddressMap("EVM", [
  ["0x788ba01f8e2b87c08b142db46f82094e0bdcad4f", {}],
])

const solanaBlacklistTokensMarketcap = new NormalizedAddressMap("SOLANA", [
  ["31iQsahfa4CMiirU7REygBzuAWg4R4ah7Y4aDu9ZfXJP", {}],
  ["DcUoGUeNTLhhzyrcz49LE7z3MEFwca2N9uSw1xbVi1gm", {}],
])

export const BLACKLIST_TOKENS_MARKETCAP = new Map<
  number,
  NormalizedAddressMap<string, unknown>
>([
  [ETHEREUM_CHAIN_ID, ethereumBlacklistTokensMarketcap],
  [BNB_CHAIN_ID, bnbBlacklistTokensMarketcap],
  [FUSE_CHAIN_ID, fuseBlacklistTokensMarketcap],
  [POLYGON_CHAIN_ID, polygonBlacklistTokensMarketcap],
  [BASE_CHAIN_ID, baseBlacklistTokensMarketcap],
  [CELO_CHAIN_ID, celoBlacklistTokensMarketcap],
  [SOLANA_CHAIN_ID, solanaBlacklistTokensMarketcap],
])
