import {
  formatJsonRpcError,
  formatJsonRpcResult,
} from "@walletconnect/jsonrpc-utils"
import type { SignClientTypes } from "@walletconnect/types"
import { getSdkError } from "@walletconnect/utils"
import type { AbstractSigner } from "ethers"

import { getEthersProvider } from "ethers-utils"

import { EIP155_SIGNING_METHODS } from "../data/EIP155Data"
import { openWalletConnectDialog } from "../store/walletConnectDialogStore"
import {
  getSignParamsMessage,
  getSignTypedDataParamsData,
} from "../utils/HelperUtils"

type RequestEventArgs = Omit<
  SignClientTypes.EventArguments["session_request"],
  "verifyContext"
>

export async function approveEIP155Request(
  wallet: AbstractSigner,
  requestEvent: RequestEventArgs,
) {
  const { params, id } = requestEvent
  const { chainId, request } = params

  switch (request.method) {
    case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
      try {
        const message = getSignParamsMessage(request.params, "bytes")
        const signedMessage = await wallet.signMessage(message)
        return formatJsonRpcResult(id, signedMessage)
      } catch (error) {
        console.error(error)
        const message =
          error instanceof Error ? error.message : `${request.method} failed!`
        openWalletConnectDialog({
          type: "error",
          errorText: message,
          acceptBtnText: "Ok",
        })
        return formatJsonRpcError(id, message)
      }

    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
      try {
        const {
          domain,
          types,
          message: data,
        } = getSignTypedDataParamsData(request.params)

        // https://github.com/ethers-io/ethers.js/issues/687#issuecomment-714069471
        delete types.EIP712Domain
        const signedData = await wallet.signTypedData(domain, types, data)
        return formatJsonRpcResult(id, signedData)
      } catch (error) {
        console.error(error)
        const message =
          error instanceof Error ? error.message : `${request.method} failed!`
        openWalletConnectDialog({
          type: "error",
          errorText: message,
          acceptBtnText: "Ok",
        })
        return formatJsonRpcError(id, message)
      }

    case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
      try {
        //ChainId of format e.g. eip155:1 for Ethereum Mainnet
        const provider = getEthersProvider(Number(chainId.split(":")[1]))
        const sendTransaction = request.params[0]
        if (sendTransaction.gas && !sendTransaction.gasLimit) {
          sendTransaction.gasLimit = sendTransaction.gas
        }
        const connectedWallet = wallet.connect(provider)
        const hash = await connectedWallet.sendTransaction(sendTransaction)
        const receipt = typeof hash === "string" ? hash : hash?.hash // TODO improve interface
        return formatJsonRpcResult(id, receipt)
      } catch (error) {
        console.error(error)
        const message =
          error instanceof Error ? error.message : `${request.method} failed!`

        openWalletConnectDialog({
          type: "error",
          errorText: message,
          acceptBtnText: "Ok",
        })
        return formatJsonRpcError(id, message)
      }

    case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
      try {
        const signTransaction = request.params[0]
        const signature = await wallet.signTransaction(signTransaction)
        return formatJsonRpcResult(id, signature)
      } catch (error) {
        console.error(error)
        const message =
          error instanceof Error ? error.message : `${request.method} failed!`

        await openWalletConnectDialog({
          type: "error",
          errorText: message,
          acceptBtnText: "Ok",
        })
        return formatJsonRpcError(id, message)
      }
    default:
      throw new Error(getSdkError("INVALID_METHOD").message)
  }
}
