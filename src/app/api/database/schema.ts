import {
  bigint,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"

import { lower } from "./utils"

export const tokensTable = pgTable(
  "tokens",
  {
    chainId: bigint("chainId", { mode: "number" }).notNull(),
    address: varchar("address").notNull(),
    logoURI: varchar("logoURI"),
    name: varchar("name").notNull(),
    symbol: varchar("symbol").notNull(),
    decimals: integer("decimals").notNull(),
    priceUSD: varchar("priceUSD"),
    marketCapUSD: doublePrecision("marketCapUSD"),
    volumeUSD24H: doublePrecision("volumeUSD24H"),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.chainId, table.address] }),
    index("chainId_idx").on(table.chainId),
    index("address_idxs").on(table.address),
  ],
)

export const airdropUsers = pgTable(
  "airdrop",
  {
    id: varchar("id"),
    email: varchar("email"),
    username: varchar("username"),
    evmAddress: varchar("evmAddress").primaryKey(),
    timestamp: timestamp().notNull().defaultNow(),
  },
  (table) => [uniqueIndex("evmAddressUniqueIndex").on(lower(table.evmAddress))],
)
