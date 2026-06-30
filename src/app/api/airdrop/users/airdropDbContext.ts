import type z from "zod"

import { getDB } from "../../database/getDb"
import { airdropUsers } from "../../database/schema"
import type { AirdropStorageContext, AirdropUserInfoFromClient } from "./types"

export const airdropDbContext: AirdropStorageContext = {
  async insert(user: z.infer<typeof AirdropUserInfoFromClient>) {
    const db = await getDB()
    await db.insert(airdropUsers).values({
      email: user.email,
      username: user.username,
      id: user.id,
      evmAddress: user.evmAddress,
    })
  },
}
