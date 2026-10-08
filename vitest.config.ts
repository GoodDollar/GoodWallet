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
    // Array order matters: specific "@/config*" entries must precede the "@" catch-all.
    alias: [
      {
        find: "@/config",
        replacement: path.resolve(__dirname, "./config"),
      },
      {
        find: "@/configServerless",
        replacement: path.resolve(__dirname, "./configServerless"),
      },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      {
        find: "translations",
        replacement: path.resolve(__dirname, "./src/translations"),
      },
      {
        find: "ethers-utils",
        replacement: path.resolve(__dirname, "./src/ethers-utils"),
      },
      {
        find: "gooddollar",
        replacement: path.resolve(__dirname, "./src/gooddollar"),
      },
      // Mock the AI Credits widget register module in tests since the package
      // is installed via local tarball and its side-effect registration is not
      // needed during unit tests.
      {
        find: "@goodwidget/ai-credits-widget/register",
        replacement: path.resolve(
          __dirname,
          "./src/widgets/fixtures/aiCreditsWidgetRegisterMock.ts",
        ),
      },
    ],
  },
})
