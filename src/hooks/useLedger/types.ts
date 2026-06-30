export enum TxDirection {
  INCOMING = "incoming",
  OUTGOING = "outgoing",
}

export type Tx = {
  chainId: number
  hash: string
  amount: string
  timestamp: number
  from: string
  to: string
  gas?: string
  tokenAddress: string
  method?: string
  txDirection: TxDirection
}
