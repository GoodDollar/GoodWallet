// /api/chains/{family}/addresses/{address}/history
import { type NextRequest, NextResponse } from "next/server"

import { throwIfQueryParamIsNull } from "@/app/api/utils/throwIfQueryParamIsNull"
import {
  BITCOIN_FAMILY,
  BITCOIN_TESTNET_FAMILY,
  type ChainFamily,
  DOGE_FAMILY,
  DOGE_TESTNET_FAMILY,
  EVM_FAMILY,
  isSupportedFamily,
  SOLANA_DEVNET_FAMILY,
  SOLANA_FAMILY,
  XRP_FAMILY,
  XRP_TESTNET_FAMILY,
} from "@/chain/types"

import { getEVMHistory } from "./evmHistory"
import { getSolanaHistory } from "./solanaHistory"
import { getUTXOHistory } from "./utxoHistory"
import { getXrpHistory } from "./xrpHistory"

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ family: string; address: string }>
  },
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const chainId = searchParams.get("chainId")
    const { family, address } = await params

    if (!isSupportedFamily(family)) {
      throw new Error(`Family not supported: ${family}`)
    }

    throwIfQueryParamIsNull({ address, family })

    const parsedChainId = chainId ? parseInt(chainId) : null
    const history = await getHistory(family, parsedChainId, address)

    return NextResponse.json(history, { status: 200 })
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred"

    return NextResponse.json(
      {
        message: "Failed to process request",
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}

const getHistory = async (
  family: ChainFamily,
  chainId: number | null,
  address: string,
) => {
  switch (family) {
    case EVM_FAMILY:
      if (chainId === null) {
        throw new Error("ChainId cannot be null for EVMs")
      }
      return await getEVMHistory(chainId, address)
    case XRP_FAMILY:
    case XRP_TESTNET_FAMILY:
      return await getXrpHistory(address, family)
    case SOLANA_FAMILY:
    case SOLANA_DEVNET_FAMILY:
      return await getSolanaHistory(address, family)
    case BITCOIN_FAMILY:
    case BITCOIN_TESTNET_FAMILY:
    case DOGE_FAMILY:
    case DOGE_TESTNET_FAMILY:
      return await getUTXOHistory(address, family)
    default:
      throw new Error("Family not supported")
  }
}
