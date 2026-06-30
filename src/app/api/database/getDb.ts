import { tokensDBConfig } from "@/configServerless"

let dbInstance:
  | ReturnType<typeof import("drizzle-orm/neon-http").drizzle>
  | ReturnType<typeof import("drizzle-orm/pglite").drizzle>
  | undefined

export const getDB = async () => {
  if (!dbInstance) {
    if (
      tokensDBConfig.url.startsWith("postgres://") ||
      tokensDBConfig.url.startsWith("postgresql://")
    ) {
      const { drizzle } = await import("drizzle-orm/neon-http")
      dbInstance = drizzle(tokensDBConfig.url)
    } else if (tokensDBConfig.url.startsWith("pglite://")) {
      const { drizzle } = await import("drizzle-orm/pglite")
      dbInstance = drizzle(tokensDBConfig.url.split("pglite://")[1])
    } else {
      throw new Error("Invalid database URL prefix.")
    }
  }
  return dbInstance
}
