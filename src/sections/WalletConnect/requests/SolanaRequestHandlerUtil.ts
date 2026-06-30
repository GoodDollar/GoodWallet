import { formatJsonRpcResult } from "@json-rpc-tools/utils"
import type { SignClientTypes } from "@walletconnect/types"
import { getSdkError } from "@walletconnect/utils"
import {
  assertIsAddress,
  createSignableMessage,
  getBase58Decoder,
  getBase58Encoder,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  getUtf8Decoder,
  type SignaturesMap,
  transactionFromBase64,
} from "gill"

import type { SVMSigner } from "@/login"

import { SOLANA_SIGNING_METHODS } from "../data/SolanaData"

export async function approveSolanaRequest(
  signer: SVMSigner,
  requestEvent: SignClientTypes.EventArguments["session_request"],
) {
  const { params, id } = requestEvent
  const { request } = params

  switch (request.method) {
    case SOLANA_SIGNING_METHODS.SOLANA_SIGN_MESSAGE: {
      const base58EncodedMessage = getBase58Encoder().encode(
        request.params.message,
      )
      const utf8 = getUtf8Decoder().decode(base58EncodedMessage)
      const signableMessage = createSignableMessage(utf8)

      const sig = await signer.signMessages([signableMessage])
      assertIsAddress(signer.address)
      const base58EncodedSignature = getBase58Decoder().decode(
        sig[0][signer.address],
      )
      return formatJsonRpcResult(id, { signature: base58EncodedSignature })
    }

    case SOLANA_SIGNING_METHODS.SOLANA_SIGN_TRANSACTION: {
      const transaction = transactionFromBase64(request.params.transaction) // This will throw an error if the transaction is invalid
      const signatures: SignaturesMap = {}

      Object.entries(transaction.signatures).forEach(([address, signature]) => {
        assertIsAddress(address)
        signatures[address] = signature
      })

      const [signature] = await signer.signTransactions([transaction])
      Object.entries(signature).forEach(([address, signature]) => {
        assertIsAddress(address)
        signatures[address] = signature
      })
      const signedTransaction = Object.freeze({
        messageBytes: transaction.messageBytes,
        signatures: Object.freeze(signatures),
      })

      const serializedTx = getBase64EncodedWireTransaction(signedTransaction)
      return formatJsonRpcResult(id, {
        transaction: serializedTx,
        signature: getSignatureFromTransaction(signedTransaction),
      })
    }
    default:
      throw new Error(getSdkError("INVALID_METHOD").message)
  }
}
