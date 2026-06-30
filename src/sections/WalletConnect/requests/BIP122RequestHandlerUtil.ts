import { formatJsonRpcResult } from "@json-rpc-tools/utils"
import type { SignClientTypes } from "@walletconnect/types"
import { getSdkError } from "@walletconnect/utils"
import * as bitcoin from "bitcoinjs-lib"
import { parseUnits } from "ethers"

import { BITCOIN_CHAIN_ID } from "@/chain/chain-ids"
import { BITCOIN, BITCOIN_TESTNET } from "@/chain/chains"
import { getChainProvider } from "@/chain/provider/provider"
import { BITCOIN_FAMILY, BITCOIN_TESTNET_FAMILY } from "@/chain/types"
import type { BTCSigner } from "@/login"
import { DerivationPaths } from "@/utils/derivationPaths"

import {
  BIP122_MAINNET_CAIP2,
  BIP122_SIGNING_METHODS,
  BIP122_TO_CHAIN_ID,
} from "../data/BIP122Data"

export const approveBIP122Request = async (
  signer: BTCSigner,
  requestEvent: SignClientTypes.EventArguments["session_request"],
) => {
  const { params, id } = requestEvent
  const { request } = params
  const chainId = params.chainId
  const path =
    Number(chainId) === BITCOIN_CHAIN_ID
      ? DerivationPaths.BTC
      : DerivationPaths.BTC_TESTNET

  switch (request.method) {
    case BIP122_SIGNING_METHODS.BIP122_SIGN_PSBT: {
      const psbt = request.params.psbt
      const network =
        chainId === BIP122_MAINNET_CAIP2
          ? bitcoin.networks.bitcoin
          : bitcoin.networks.testnet
      const btcPsbt = bitcoin.Psbt.fromBase64(psbt, {
        network: network,
      })
      const result = await signer.signPsbt(btcPsbt)
      return formatJsonRpcResult(id, { psbt: result })
    }
    case BIP122_SIGNING_METHODS.BIP122_GET_ACCOUNT_ADDRESSES: {
      return formatJsonRpcResult(
        id,
        Array.from([
          {
            address: signer.address,
            publicKey: signer.publicKey,
            path,
          },
        ]),
      )
    }
    case BIP122_SIGNING_METHODS.BIP122_SEND_TRANSACTION: {
      const { recipientAddress, amount } = request.params
      const provider = getChainProvider(BIP122_TO_CHAIN_ID[chainId])

      if (
        provider.family !== BITCOIN_FAMILY &&
        provider.family !== BITCOIN_TESTNET_FAMILY
      ) {
        throw new Error(`Unsupported chain family: ${provider.family}`)
      }

      const decimals =
        chainId === BIP122_MAINNET_CAIP2
          ? BITCOIN.nativeCurrency.decimals
          : BITCOIN_TESTNET.nativeCurrency.decimals

      const amountSats = parseUnits(amount, decimals)
      const satsPerByte = await provider.getNetworkFeeSatsPerByte()
      if (amountSats < provider.DUST_AMOUNT) {
        console.warn(
          `Transaction amount (${amountSats}) is below the dust threshold (${provider.DUST_AMOUNT}). PSBT creation skipped.`,
        )
        return
      }

      const psbt = await provider.createSendToPSBT(
        signer.address,
        recipientAddress,
        amountSats,
        satsPerByte,
      )
      const signedPsbt = await signer.signPsbt(psbt)
      const txId = await provider.broadcastTransaction(signedPsbt)
      return formatJsonRpcResult(id, { txId })
    }
    default: {
      throw new Error(getSdkError("INVALID_METHOD").message)
    }
  }
}
