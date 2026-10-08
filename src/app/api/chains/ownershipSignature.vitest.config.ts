import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Isolated crypto tests: the shared config's broad @ alias shadows @/config.
// Keep this override local rather than changing unrelated test infrastructure.
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/app/api/chains/ownershipSignature.test.ts",
      "src/app/api/chains/ownershipSession.test.ts",
      "src/app/api/chains/clientAddressSession.test.ts",
      "src/app/api/chains/ownershipRoutes.test.ts",
      "src/app/api/chains/chainsProxy.test.ts",
    ],
  },
  resolve: {
    alias: [
      {
        find: "@/config",
        replacement: fileURLToPath(
          new URL("../../../../config.ts", import.meta.url),
        ),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("../../../", import.meta.url)),
      },
    ],
  },
})
