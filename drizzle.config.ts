import { defineConfig } from "drizzle-kit"

export default defineConfig({
  out: "./drizzle",
  schema: "./src/app/api/database/schema.ts",
  dialect: "postgresql",
  driver: "pglite",
  casing: "camelCase",
  dbCredentials: {
    url: "./data/local.db",
  },
})
