import { z } from "zod"

import type { airdropUsers } from "../../database/schema"

export type AirdropUserInfo = typeof airdropUsers.$inferInsert
export const AirdropUserInfoFromClient = z.object({
  username: z.string().optional(),
  email: z.email().optional(),
  evmAddress: z.string(),
  id: z.string().optional(),
})

export type AirdropStorageContext = {
  insert: (user: z.infer<typeof AirdropUserInfoFromClient>) => Promise<unknown>
}
