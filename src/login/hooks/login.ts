import { useCallback } from "react"
import type {
  AggregateLoginParams,
  SingleLoginParams,
} from "@toruslabs/customauth"

import { getPrivateKeySession } from "../adapters/privatekey"
import {
  getTorusSession,
  type TorusNetwork,
  torusAggregateLogin,
  torusLogin,
} from "../torus"
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
  args: SingleLoginParams,
) =>
  useCallback(
    () => torusLogin(network, web3authClientId, args),
    [network, web3authClientId, args],
  )

export const useTriggerTorusAggregateLogin = (
  network: TorusNetwork,
  web3authClientId: string,
  args: AggregateLoginParams,
) =>
  useCallback(
    () => torusAggregateLogin(network, web3authClientId, args),
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
