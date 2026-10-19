import { defineConfig, devices } from "@playwright/test"

const testWalletSeed =
  "4c4d6a7e5f6a8b9c0d1e2f30415263748596a7b8c9d0e1f2031425364758697a"

export default defineConfig({
  testDir: "./tests-playwright",
  testMatch: "**/*.e2e.ts",
  outputDir: "tests-playwright/artifacts",
  snapshotPathTemplate: "{testDir}/screenshots/{projectName}/{arg}{ext}",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 30_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
  ],
  webServer: {
    command: "yarn next dev --turbo -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    env: {
      ...process.env,
      NEXT_PUBLIC_PLAYWRIGHT_TEST_MODE: "true",
      NEXT_PUBLIC_LOGIN_GOOGLE_ENABLED: "false",
      NEXT_PUBLIC_LOGIN_FACEBOOK_ENABLED: "false",
      NEXT_PUBLIC_LOGIN_PWLESS_ENABLED: "false",
      NEXT_PUBLIC_TEST_LOGIN_ENABLED: "true",
      NEXT_PUBLIC_TEST_LOGIN_MASTER_SEED: testWalletSeed,
      NEXT_PUBLIC_TEST_LOGIN_USER_NAME: "Playwright test wallet",
      NEXT_PUBLIC_TEST_LOGIN_PROFILE_IMAGE: "/icon.svg",
    },
  },
})
