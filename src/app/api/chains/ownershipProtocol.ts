import { z } from "zod"

import { ChainFamily } from "@/chain/types"

export const OwnershipScope = z.object({
  family: z.enum(ChainFamily),
  address: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z0-9]+$/),
})

export const normalizeOwnershipAddress = (family: string, address: string) =>
  family === "EVM" ? address.toLowerCase() : address

// Both sides construct exactly this message; never sign arbitrary server text.
export const ownershipMessage = (challenge: string) =>
  `GoodWallet wallet login v2\nUse this signature to log in and authorize wallet-scoped blockchain reads.\nChallenge: ${challenge}`
