import { z } from "zod"

export enum TransactionType {
  Native,
  ERC20,
  Internal,
  FuseInternal,
}

const castToNum = z.preprocess((val) => Number(val), z.number())

const fuseBaseItemSchema = z.object({
  from: z.string(),
  input: z.string(),
  timeStamp: castToNum,
  to: z.string(),
  value: z.string(),
  gasUsed: z.string(),
  gasPrice: z.string().optional(),
})

const fuseInternalItemSchema = fuseBaseItemSchema
  .extend({
    transactionHash: z.string(),
  })
  .transform((values) => ({
    ...values,
    type: TransactionType.FuseInternal as const,
  }))

export type FuseInternalItem = z.infer<typeof fuseInternalItemSchema>
export const fuseInternalSchema = z.array(fuseInternalItemSchema)
export type FuseInternalTxResponse = z.infer<typeof fuseInternalSchema>

export const fourBytesResponseSchema = z.object({
  total_pages: z.number(),
  total_items: z.number(),
  items: z.array(
    z.object({
      id: z.number(),
      text: z.string().transform((e) => e.split("(")[0]),
      hash: z.string(),
      is_valid: z.boolean(),
      added_at: z.string(),
    }),
  ),
})

export type FourByteResponse = z.infer<typeof fourBytesResponseSchema>

const scanBaseSchema = z.object({
  from: z.string(),
  input: z.string().transform((input) => (input !== "deprecated" ? input : "")),
  timeStamp: castToNum,
  to: z.string(),
  value: z.string(),
  hash: z.string(),
  gasUsed: z.string(),
})

const scanNativeItemSchema = scanBaseSchema
  .extend({
    gasPrice: z.string(),
  })
  .transform((values) => ({
    ...values,
    type: TransactionType.Native as const,
  }))

const scanInternalItemSchema = scanBaseSchema
  .extend({
    gasPrice: z.string().optional(),
  })
  .transform((values) => ({
    ...values,
    type: TransactionType.Internal as const,
  }))

const scanErc20ItemSchema = scanBaseSchema
  .extend({
    tokenDecimal: castToNum,
    contractAddress: z.string(),
    gasPrice: z.string(),
  })
  .transform((values) => ({
    ...values,
    type: TransactionType.ERC20 as const,
  }))

export type ScanNativeItem = z.infer<typeof scanNativeItemSchema>
export type ScanErc20Item = z.infer<typeof scanErc20ItemSchema>
export type ScanInternalItem = z.infer<typeof scanInternalItemSchema>

export const scanNativeSchema = z.array(scanNativeItemSchema)
export const scanERC20Schema = z.array(scanErc20ItemSchema)
export const scanInternalSchema = z.array(scanInternalItemSchema)

export type ScanNativeTxResponse = z.infer<typeof scanNativeSchema>
export type ScanErc20TxResponse = z.infer<typeof scanERC20Schema>
export type ScanInternalTxResponse = z.infer<typeof scanInternalSchema>
