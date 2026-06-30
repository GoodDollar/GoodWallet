import { parseUnits } from "ethers"
import { z } from "zod"

const coercedNumber = z.preprocess((val) => {
  //Doge + DogeTestnet returns as string in whole units :/
  if (typeof val === "string") {
    const decimalString = Number(val).toFixed(8)
    return Number(parseUnits(decimalString, 8))
  }
  return val
}, z.number())

export const BalanceSchema = z.object({
  incoming: z.string().transform(parseFloat),
  outgoing: z.string().transform(parseFloat),
})

export const networkFeeSchema = z.object({
  fast: z.number(),
  medium: z.number(),
  slow: z.number(),
  block: z.number(),
})
export const transactionResponseSchema = z.object({
  txId: z.string(),
})
const transactionSchema = z.object({
  hash: z.string(),
  fee: coercedNumber,
  time: z.number(),
  inputs: z.array(
    z.object({
      coin: z.object({
        address: z.string().nullable(),
        value: coercedNumber,
      }),
    }),
  ),
  outputs: z.array(
    z.object({
      address: z.string().nullable(),
      value: coercedNumber,
    }),
  ),
})

const unspentUTXOSchema = z.object({
  address: z.string(),
  txHash: z.string(),
  index: z.number(),
  value: coercedNumber,
})

export const transactionsSchema = z.array(transactionSchema)
export const unspentUTXOsSchema = z.array(unspentUTXOSchema)
