import type { Jsonify } from "type-fest"
import { proxy, ref } from "valtio"

import { getPrivateKeySession } from "@/login/adapters/privatekey"
import type { Addresses, ISigner, ISignerSession } from "@/login/types"

const SIGNER_SESSION_KEY = "SIGNER_SESSION"

export const getSessionFromLocalStorage =
  async (): Promise<ISignerSession | null> => {
    if (typeof localStorage === "undefined") {
      return null
    }
    const session = localStorage.getItem(SIGNER_SESSION_KEY)
    if (!session) {
      return null
    }
    const sessionJSON = JSON.parse(session) as Jsonify<ISignerSession>
    return await fromJSON(sessionJSON)
  }

const fromJSON = async (
  sessionJSON: Partial<Jsonify<ISignerSession>>,
): Promise<ISignerSession | null> => {
  switch (sessionJSON.type) {
    case "PRIVATE_KEY": {
      const { userName, profileImage, authProvider, masterSeed } = sessionJSON
      if (!masterSeed) {
        return null
      }
      return await getPrivateKeySession(
        masterSeed,
        "localStorage",
        authProvider ?? "NA",
        userName,
        profileImage,
      )
    }
  }
  return null
}

type SessionState = {
  session: null | ISignerSession
  addresses?: Addresses
  isLoading: boolean
}

export const sessionState = proxy<SessionState>({
  session: null,
  addresses: undefined,
  isLoading: true,
})

export const setSession = (session: ISignerSession | null) => {
  sessionState.session = session && ref(session)
  if (session) {
    const addressMap = new Map<keyof ISigner, string>()
    for (const [key, value] of Object.entries(session.signer)) {
      addressMap.set(key as keyof ISigner, value.address)
    }
    sessionState.addresses = addressMap
  } else {
    sessionState.addresses = undefined
  }

  if (sessionState.session) {
    localStorage.setItem(
      SIGNER_SESSION_KEY,
      JSON.stringify(sessionState.session),
    )
  } else {
    localStorage.removeItem(SIGNER_SESSION_KEY)
  }

  sessionState.isLoading = false
}

export const logout = () => {
  setSession(null)
}

if (typeof window !== "undefined") {
  getSessionFromLocalStorage()
    .then(setSession)
    .catch((e) => {
      console.error("error getting persisted session", e)
      setSession(null)
    })
}
