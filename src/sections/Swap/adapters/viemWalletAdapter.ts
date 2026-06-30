import type {
  TransactionRequest,
  TypedDataDomain,
  TypedDataField,
} from "ethers"
import type { Hex, TransactionSerializable } from "viem"
import { toAccount } from "viem/accounts"

import type { EVMSigner } from "@/login/types"

/** Copied from ThirdWeb's sdk
 * https://github.com/thirdweb-dev/js/blob/main/packages/thirdweb/src/adapters/ethers6.ts#L496
 * */
const alignTxToEthers = (tx: TransactionSerializable) => {
  const { type: viemType, gas: gasLimit, ...rest } = tx

  // massage "type" to fit ethers
  let type: number | null
  switch (viemType) {
    case "legacy": {
      type = 0
      break
    }
    case "eip2930": {
      type = 1
      break
    }
    case "eip1559": {
      type = 2
      break
    }
    default: {
      type = null
      break
    }
  }
  return {
    ...rest,
    gasLimit,
    type,
  } as TransactionRequest
}

export const getViemAccount = (signer: EVMSigner) => {
  return toAccount({
    address: signer.address as Hex,
    async signMessage({ message }) {
      return signer.signMessage(
        typeof message === "string" ? message : message.raw,
      ) as Promise<Hex>
    },
    async signTransaction(transaction) {
      return signer.signTransaction(
        alignTxToEthers(transaction),
      ) as Promise<Hex>
    },
    async signTypedData(data) {
      if (data.types) {
        // In ethers, the EIP712Domain is implied and needs to be removed from the object
        delete data.types.EIP712Domain
      }
      return (await signer.signTypedData(
        data.domain as TypedDataDomain,
        data.types as Record<string, TypedDataField[]>,
        data.message as Record<string, unknown>,
      )) as Hex
    },
  })
}
