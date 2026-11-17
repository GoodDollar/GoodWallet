import {
  CustomAuth,
  type CustomAuthLoginParams,
  type TorusLoginResponse,
} from "@toruslabs/customauth"

import { getPrivateKeySession } from "./adapters/privatekey"
import type { ISignerSession } from "./types"

export type TorusNetwork = "mainnet" | "testnet"

export type TorusConfig = {
  network: TorusNetwork
  web3AuthClientId: string
  useCoreKitKey: boolean
  captchaKey: string
  providers: {
    google: CustomAuthLoginParams
    facebook: CustomAuthLoginParams
    pwdless: CustomAuthLoginParams
  }
}

export const torusLogin = async (
  network: TorusNetwork,
  web3AuthClientId: string,
  args: CustomAuthLoginParams,
) => {
  const torus = await initTorus(network, web3AuthClientId)

  await torus.triggerLogin(args)
}

export const getTorusSession = async (
  network: TorusNetwork,
  web3AuthClientId: string,
): Promise<ISignerSession> => {
  const torus = await initTorus(network, web3AuthClientId)

  const loginDetails = await torus.getRedirectResult({
    replaceUrl: false,
    clearLoginDetails: false,
  })

  if (loginDetails.error) {
    throw new Error(loginDetails.error)
  }

  const result = loginDetails.result as TorusLoginResponse | undefined
  const userInfo = result?.userInfo
  if (!userInfo) {
    throw new Error("No user info in Torus login result")
  }
  if (!result?.finalKeyData?.privKey) {
    throw new Error("no privateKey from " + userInfo.authConnection)
  }
  return getPrivateKeySession(
    result.finalKeyData.privKey,
    "torus",
    userInfo.authConnection === "custom" ? "jwt" : userInfo.authConnection,
    userInfo.name,
    userInfo.profileImage,
  )
}

const initTorus = async (network: TorusNetwork, web3AuthClientId: string) => {
  const torus = new CustomAuth({
    uxMode: "redirect",
    baseUrl: window.location.origin,
    redirectPathName: "Welcome/Auth",
    network,
    web3AuthClientId,
  })

  await torus.init({ skipSw: true })

  return torus
}
