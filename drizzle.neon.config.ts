import dotenv from "dotenv"
import { defineConfig } from "drizzle-kit"

dotenv.config({ path: ".env.production" })

export default defineConfig({
  out: "./drizzle-neon",
  schema: "./src/app/api/database/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_TOKENS_DATABASE_URL as string,
  },
})
