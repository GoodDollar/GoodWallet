import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/config": path.resolve(__dirname, "./config"),
      "@/configServerless": path.resolve(__dirname, "./configServerless"),
      translations: path.resolve(__dirname, "./src/translations"),
      "ethers-utils": path.resolve(__dirname, "./src/ethers-utils"),
      "ethers-utils/*": path.resolve(__dirname, "./src/ethers-utils"),
      gooddollar: path.resolve(__dirname, "./src/gooddollar"),
      "gooddollar/*": path.resolve(__dirname, "./src/gooddollar"),
    },
  },
})
