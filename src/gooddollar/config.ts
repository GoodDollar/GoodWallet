import { CELO_CHAIN_ID, FUSE_CHAIN_ID, XDC_CHAIN_ID } from "@/chain/chain-ids"

import type { Apps, ClaimConfig, G$Contracts } from "./types"

const g$Config: Partial<ClaimConfig> = {}

const apps: Record<G$Contracts, Apps> = {
  production: {
    identityUrl: "https://goodid.gooddollar.org",
    backend: "https://goodserver.gooddollar.org",
  },
  staging: {
    identityUrl: "https://goodid-qa.vercel.app",
    backend: "https://goodserver-qa.herokuapp.com",
  },
  development: {
    identityUrl: "https://goodid-dev.vercel.app",
    backend: "https://good-server.herokuapp.com",
  },
}

const checkConfig = () => {
  if (!g$Config.contracts) {
    throw new Error("G$ Claim contracts wasn't configured.")
  }
}

const getAppUrl = (name: keyof Apps): string => {
  const { contracts } = g$Config

  checkConfig()
  return apps[contracts as G$Contracts][name]
}

export const getG$Decimals = (chainId: number): number =>
  chainId === FUSE_CHAIN_ID ? 2 : 18

export const getContractsNetwork = (chainId: number): string => {
  const chain = Number(chainId)
  const { contracts } = g$Config

  checkConfig()

  // by default network name in deployment.json equals to the env name
  let network = contracts as string

  if (chain === CELO_CHAIN_ID) {
    network += "-celo" // for celo it's suffixed with '-celo'
  } else if (chain === XDC_CHAIN_ID) {
    network += "-xdc" // for xdc it's suffixed with '-xdc'
  } else if (chain === FUSE_CHAIN_ID) {
    // but for fuse on dev it's 'fuse'
    if (contracts === "development") {
      network = "fuse"
    }
  } else {
    throw new Error(`G$ UBI isn't supported over chain ID '${chain}'.`)
  }

  return network
}

export const getContractsVersion = (): G$Contracts => {
  const { contracts } = g$Config

  checkConfig()
  return contracts as G$Contracts
}

export const getGoodIDUrl = () => getAppUrl("identityUrl")
export const getGoodServerUrl = () => getAppUrl("backend")

export const configureContracts = (env: ClaimConfig["contracts"]) =>
  (g$Config.contracts = env)
