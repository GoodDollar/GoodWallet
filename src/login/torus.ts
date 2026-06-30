import {
  type AggregateLoginParams,
  CustomAuth,
  type RedirectResult,
  type SingleLoginParams,
  TORUS_METHOD,
  type TorusAggregateLoginResponse,
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
    google: AggregateLoginParams
    facebook: SingleLoginParams
    pwdless: SingleLoginParams
  }
}

export const torusLogin = async (
  network: TorusNetwork,
  web3AuthClientId: string,
  args: SingleLoginParams,
) => {
  const torus = await initTorus(network, web3AuthClientId)

  await torus.triggerLogin(args)
}

export const torusAggregateLogin = async (
  network: TorusNetwork,
  web3AuthClientId: string,
  args: AggregateLoginParams,
) => {
  const torus = await initTorus(network, web3AuthClientId)

  await torus.triggerAggregateLogin(args)
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

  const userInfo = getUserInfo(loginDetails)
  const result = loginDetails.result as
    | TorusLoginResponse
    | TorusAggregateLoginResponse
  if (result?.finalKeyData?.privKey === undefined) {
    throw new Error("no privateKey from " + userInfo.typeOfLogin)
  }
  return getPrivateKeySession(
    result.finalKeyData.privKey,
    "torus",
    userInfo.typeOfLogin,
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

const getUserInfo = (loginDetails: RedirectResult) => {
  const { method, result } = loginDetails

  switch (method) {
    case TORUS_METHOD.TRIGGER_LOGIN:
      return (result as TorusLoginResponse).userInfo

    case TORUS_METHOD.TRIGGER_AGGREGATE_LOGIN:
      return (result as TorusAggregateLoginResponse).userInfo[0]

    default:
      throw new Error(`Unsupported Login Method ${method}`)
  }
}
