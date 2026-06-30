"use server"

import { formatUnits, isSameAddress, ZERO_ADDRESS } from "ethers-utils"
import { FUSE_CHAIN_ID } from "@/chain/chain-ids"
import { rpcConfig } from "@/configServerless"
import {
  type FuseInternalItem,
  type FuseInternalTxResponse,
  fuseInternalSchema,
  type ScanErc20Item,
  type ScanErc20TxResponse,
  type ScanInternalItem,
  type ScanInternalTxResponse,
  type ScanNativeItem,
  type ScanNativeTxResponse,
  scanERC20Schema,
  scanInternalSchema,
  scanNativeSchema,
  TransactionType,
} from "@/schemas/api/ledger/TransactionsSchema"

import { type Tx, TxDirection } from "./types"
import { fetchAndParse, fetchFunctionSignature } from "./utils"

const transformTxList = async (
  scanTxList: (
    | ScanErc20Item
    | ScanNativeItem
    | ScanInternalItem
    | FuseInternalItem
  )[],
  address: string,
  chainId: number,
): Promise<Tx[]> => {
  if (!scanTxList) {
    return Promise.reject("scanTxList is null")
  }

  const { ubiAddress = "", topupAddress = "", nativeToken } = rpcConfig[chainId]

  const tx: Promise<Tx[]> = Promise.all(
    scanTxList.map(
      async (
        t: ScanErc20Item | ScanNativeItem | ScanInternalItem | FuseInternalItem,
      ) => {
        const isToAddress = isSameAddress(address, t.to)
        const isFromUBI = isSameAddress(t.from, ubiAddress)
        const isFromTopup = isSameAddress(t.from, topupAddress)
        const method = await fetchFunctionSignature(
          t.input,
          isToAddress,
          isFromUBI,
          isFromTopup,
        )

        const txDirection = isToAddress
          ? TxDirection.INCOMING
          : TxDirection.OUTGOING

        const tokenDecimal =
          t.type === TransactionType.ERC20
            ? t.tokenDecimal
            : nativeToken.decimals

        const tokenAddress =
          t.type === TransactionType.ERC20 ? t.contractAddress : ZERO_ADDRESS

        const amount = formatUnits(t.value, tokenDecimal)

        const gas =
          t.gasPrice &&
          formatUnits(
            BigInt(t.gasUsed) * BigInt(t.gasPrice),
            nativeToken.decimals,
          )

        return {
          hash:
            t.type === TransactionType.FuseInternal
              ? t.transactionHash
              : t.hash,
          timestamp: t.timeStamp,
          chainId,
          amount,
          method,
          txDirection,
          tokenAddress,
          from: t.from,
          to: t.to,
          gas,
        }
      },
    ),
  )
  return tx
}

const fetchScanData = async (address: string, chainId: number) => {
  const { url, keys } = rpcConfig[chainId]
  const erc20Url = `${url}/api?chainid=${chainId}&module=account&action=tokentx&address=${address}&sort=desc&apikey=${keys.tokentx}&page=1&offset=50`
  const nativeUrl = `${url}/api?chainid=${chainId}&module=account&action=txlist&address=${address}&sort=desc&apikey=${keys.txlist}&page=1&offset=50`
  const internalUrl = `${url}/api?chainid=${chainId}&module=account&action=txlistinternal&address=${address}&sort=desc&apikey=${keys.txlistinternal}&page=1&offset=50`

  const [parsedErc20, parsedNative, parsedInternal] =
    chainId === FUSE_CHAIN_ID
      ? ((await Promise.all([
          fetchAndParse(erc20Url, scanERC20Schema),
          fetchAndParse(nativeUrl, scanNativeSchema),
          fetchAndParse(internalUrl, fuseInternalSchema),
        ])) as [
          ScanErc20TxResponse,
          ScanNativeTxResponse,
          FuseInternalTxResponse,
        ])
      : ((await Promise.all([
          fetchAndParse(erc20Url, scanERC20Schema),
          fetchAndParse(nativeUrl, scanNativeSchema),
          fetchAndParse(internalUrl, scanInternalSchema),
        ])) as [
          ScanErc20TxResponse,
          ScanNativeTxResponse,
          ScanInternalTxResponse,
        ])

  return {
    erc20: parsedErc20,
    native: parsedNative,
    internal: parsedInternal,
  }
}

const filterNonZeroAmount = (
  native: ScanNativeTxResponse,
): ScanNativeTxResponse => {
  return native.filter((tx) => Number(tx.value) > 0)
}

export const getAllScanTransactions = async (
  chainId: number,
  address: string,
) => {
  const { erc20, native, internal } = await fetchScanData(address, chainId)
  const txList = [...filterNonZeroAmount(native), ...erc20, ...internal]
  const transformedTx: Tx[] = await transformTxList(txList, address, chainId)
  return transformedTx.sort((a, b) => b.timestamp - a.timestamp)
}
