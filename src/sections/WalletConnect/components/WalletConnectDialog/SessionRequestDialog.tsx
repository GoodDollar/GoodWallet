import { useMemo } from "react"
import type { SignClientTypes } from "@walletconnect/types"
import { getBase58Encoder, getUtf8Decoder } from "gill"
import { Text } from "ui"
import { useSnapshot } from "valtio"

import { getChainName } from "@/chain/chains"

import { EIP155_SIGNING_METHODS } from "../../data/EIP155Data"
import { SOLANA_SIGNING_METHODS } from "../../data/SolanaData"
import { walletConnectState } from "../../store/walletConnectStore"
import {
  getInternalChainId,
  getSignParamsMessage,
  getSignTypedDataParamsData,
} from "../../utils/HelperUtils"
import { SessionsHeader } from "../SessionsHeader/SessionsHeader"
import { getIcon } from "./utils"
import styles from "./WalletConnectDialog.module.css"

export type Props = {
  sessionRequest: SignClientTypes.EventArguments["session_request"]
}

const safelyParsedString = (str: string) => {
  try {
    return JSON.parse(str)
  } catch (error) {
    console.warn(`Error parsing JSON`, error)
  }
  return str
}

const stringify = (data: unknown) => JSON.stringify(data, null, 2)

export const SessionRequestDialog = ({ sessionRequest }: Props) => {
  const { chainId } = sessionRequest.params
  const { sessions } = useSnapshot(walletConnectState)

  const { icons, name, url } =
    sessions.find((session) => session.topic === sessionRequest?.topic)?.peer
      .metadata || {}

  const icon = getIcon(url, icons)

  const internalChainId = getInternalChainId(chainId)

  const formattedMessage = useMemo(() => {
    const data = sessionRequest.params.request.params
    const method = sessionRequest.params.request.method
    if (method === SOLANA_SIGNING_METHODS.SOLANA_SIGN_MESSAGE) {
      const base58EncodedMessage = getBase58Encoder().encode(data.message)
      return getUtf8Decoder().decode(base58EncodedMessage)
    }

    if (Array.isArray(data)) {
      switch (method) {
        case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
          return getSignParamsMessage(data)
        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4: {
          const { domain, message } = getSignTypedDataParamsData(data)
          return stringify({ domain, message })
        }
        default:
          return stringify(
            data.map((item: unknown) => {
              if (
                typeof item === "string" &&
                item.startsWith("{") &&
                item.endsWith("}")
              ) {
                return safelyParsedString(item)
              }
              return item
            }),
          )
      }
    }
    return stringify(data)
  }, [sessionRequest])

  return (
    <div className={styles.sessionProposalContent}>
      <SessionsHeader
        icon={icon}
        name={name}
        url={url}
        status={sessionRequest.params.request.method}
      />

      <div className={styles.sessionRequestDetailsRow}>
        <Text style="16-600">Blockchain</Text>
        <Text style="14-400" color="text-soft">
          {getChainName(internalChainId)}
        </Text>
      </div>
      <div className={styles.sessionRequestDetailsRow}>
        <Text style="16-600">Data Params</Text>
        <pre className={styles.sessionRequestDetailsData}>
          {formattedMessage}
        </pre>
      </div>
    </div>
  )
}
