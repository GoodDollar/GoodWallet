import { useSnapshot } from "valtio"

import {
  logout,
  type ReconnectReason,
  sessionState,
  setSession,
} from "../context/SessionContext/storage"
import type { Addresses, ISignerSession } from "../types"

export type ISessionContext = Partial<ISignerSession> & {
  addresses?: Addresses
  isLoading: boolean
  reconnectReason?: ReconnectReason
  logout?: () => void
  setSession(session: ISignerSession): void
}

export const useSessionContext = (): ISessionContext => {
  const { session, addresses, isLoading, reconnectReason } =
    useSnapshot(sessionState)
  return {
    ...session,
    addresses,
    isLoading,
    reconnectReason,
    setSession,
    logout,
  }
}
