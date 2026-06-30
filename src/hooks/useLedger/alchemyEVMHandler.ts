"use server"

import { z } from "zod"

import { getViemClient } from "@/chain/provider/EVM/viemClients"
import { rpcConfig } from "@/configServerless"
import { ZERO_ADDRESS } from "@/ethers-utils"

import { type Tx, TxDirection } from "./types"

const AlchemyResponse = z.object({
  jsonrpc: z.string(),
  id: z.number(),
  result: z.object({
    transfers: z.array(
      z.object({
        blockNum: z.string().optional(),
        from: z.string(),
        to: z.string(),
        value: z.number().nullable(),
        hash: z.string(),
        rawContract: z.object({
          address: z.string().nullable(),
        }),
        metadata: z
          .object({
            blockTimestamp: z.string(),
          })
          .nullable(),
      }),
    ),
  }),
})

const fetchScanAlchemyData = async (
  direction: "outgoing" | "incoming",
  address: string,
  chainId: number,
): Promise<Tx[]> => {
  try {
    const resp = await fetch(rpcConfig[chainId].url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_getAssetTransfers",
        params: [
          {
            fromBlock: "0x0",
            toBlock: "latest",
            fromAddress: direction === "outgoing" ? address : undefined,
            toAddress: direction === "incoming" ? address : undefined,
            withMetadata: true,
            excludeZeroValue: true,
            maxCount: "0x32",
            order: "desc",
            category: ["external", "erc20"].concat(
              // exclude internal transactions for chains that don't support them
              [10, 56, 8453, 42220].includes(chainId) ? [] : ["internal"],
            ),
          },
        ],
      }),
    })

    if (!resp.ok) {
      console.error("Failed to fetch data from alchemy", resp)
      return []
    }

    const parsedResp = AlchemyResponse.safeParse(await resp.json())

    if (!parsedResp.success) {
      console.error(
        `Error parsing data from alchemy for chain id: ${chainId}`,
        parsedResp.error,
      )
      return []
    }

    const getTimestamp = async (
      transfer: (typeof parsedResp.data.result.transfers)[number],
    ) => {
      const timestamp = transfer.metadata?.blockTimestamp
      if (timestamp) {
        return new Date(timestamp).getTime() / 1000
      }
      if (transfer.blockNum) {
        const viemClient = getViemClient(chainId)
        const block = await viemClient.getBlock({
          blockNumber: BigInt(transfer.blockNum),
        })
        if (block) {
          return Number(block.timestamp)
        }
      }
      throw new Error("No timestamp or block number found")
    }
    return Promise.all(
      parsedResp.data.result.transfers.map(async (transfer) => ({
        chainId,
        hash: transfer.hash,
        from: transfer.from,
        to: transfer.to,
        timestamp: await getTimestamp(transfer),
        tokenAddress: transfer.rawContract.address ?? ZERO_ADDRESS,
        rawAmount: transfer.value,
        amount: transfer.value?.toString() ?? "",
        method: direction === "incoming" ? "Received" : "Sent",
        txDirection:
          direction === "incoming"
            ? TxDirection.INCOMING
            : TxDirection.OUTGOING,
      })),
    )
  } catch (error) {
    console.error(`Error fetching transactions for chainId ${chainId}`, error)
    return []
  }
}

export const getAllAlchemyTransactions = async (
  chainId: number,
  address: string,
) => {
  const incoming = await fetchScanAlchemyData("incoming", address, chainId)
  const outgoing = await fetchScanAlchemyData("outgoing", address, chainId)

  return [...incoming, ...outgoing]
}
