import { useSnapshot } from "valtio"

import {
  logout,
  sessionState,
  setSession,
} from "../context/SessionContext/storage"
import type { Addresses, ISignerSession } from "../types"

export type ISessionContext = Partial<ISignerSession> & {
  addresses?: Addresses
  isLoading: boolean
  logout?: () => void
  setSession(session: ISignerSession): void
}

export const useSessionContext = (): ISessionContext => {
  const { session, addresses, isLoading } = useSnapshot(sessionState)
  return { ...session, addresses, isLoading, setSession, logout }
}
