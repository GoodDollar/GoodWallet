import type { Payment, Transaction, TxResponse } from "xrpl"

import type {
  ChainProvider,
  XRP_FAMILY,
  XRP_TESTNET_FAMILY,
} from "@/chain/types"

export type Fees = {
  baseFee: number
  loadFactor: number
}

export type SUPPORTED_XRP_FAMILIES =
  | typeof XRP_FAMILY
  | typeof XRP_TESTNET_FAMILY

export type XRPProvider = ChainProvider & {
  DUST_AMOUNT: number
  family: SUPPORTED_XRP_FAMILIES
  getNetworkFee: () => Promise<Fees>
  createNativeSendTransaction: (
    from: string,
    to: string,
    amountInXrp: string,
    fees?: Fees,
  ) => Promise<Transaction>
  broadcastTransaction: (tx: {
    tx_blob: string
    hash: string
  }) => Promise<TxResponse<Payment>>
}
