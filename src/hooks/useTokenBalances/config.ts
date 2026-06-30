export type Config = {
  includeTestnetTokens: boolean
  rpcUrls: { [chainId: string]: string }
  lifiConfig: {
    apiUrl: string
    chainTypes: string[]
    chainIds: number[]
  }
  alchemyConfig: {
    chainIds: number[]
  }
}
