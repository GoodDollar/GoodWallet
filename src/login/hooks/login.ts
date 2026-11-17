import { useCallback } from "react"
import type { CustomAuthLoginParams } from "@toruslabs/customauth"

import { getPrivateKeySession } from "../adapters/privatekey"
import { getTorusSession, type TorusNetwork, torusLogin } from "../torus"
import type { ISignerSession } from "../types"
import { useSessionContext } from "./context"

export const usePKeyLogin = (
  masterSeed: string,
  userName?: string,
  profileImage?: string,
) =>
  useLogin(async () =>
    getPrivateKeySession(
      masterSeed,
      "direct",
      "master_seed",
      userName,
      profileImage,
    ),
  )

export const useTriggerTorusLogin = (
  network: TorusNetwork,
  web3authClientId: string,
  args: CustomAuthLoginParams,
) =>
  useCallback(
    () => torusLogin(network, web3authClientId, args),
    [network, web3authClientId, args],
  )

export const useTorusLogin = (
  network: TorusNetwork,
  web3authClientId: string,
) => useLogin(async () => getTorusSession(network, web3authClientId))

const useLogin = (
  connectSession: () => Promise<ISignerSession>,
): (() => Promise<void>) => {
  const { setSession } = useSessionContext()

  return useCallback(
    () => connectSession().then(setSession),
    [connectSession, setSession],
  )
}
