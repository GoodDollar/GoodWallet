import { formatJsonRpcResult } from "@walletconnect/jsonrpc-utils"
import type { SignClientTypes } from "@walletconnect/types"
import { getSdkError } from "@walletconnect/utils"

import {
  EIP5792_METHODS,
  supportedEIP5792CapabilitiesForEOA,
} from "../data/EIP5792Data"

type RequestEventArgs = Omit<
  SignClientTypes.EventArguments["session_request"],
  "verifyContext"
>

export async function approveEIP5792Request(requestEvent: RequestEventArgs) {
  const { params, id } = requestEvent
  const { request } = params

  switch (request.method) {
    case EIP5792_METHODS.WALLET_GET_CAPABILITIES:
      return formatJsonRpcResult(id, supportedEIP5792CapabilitiesForEOA)
    default:
      throw new Error(getSdkError("INVALID_METHOD").message)
  }
}
