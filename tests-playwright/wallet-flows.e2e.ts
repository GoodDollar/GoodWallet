import { expect, type Page, test } from "@playwright/test"

// Screenshots are nested under `tests-playwright/<page-or-flow>/` per the
// automated Playwright plan in issue #38 and the contributor scope in #40.
// Using semantic state names (e.g. `screenshot-onboarding-da-desktop.png`)
// keeps baseline diffs and CI artifacts meaningful.
const screenshotPath = (
  flow: string,
  state: string,
  project: string,
  extension: "png" = "png",
) => `tests-playwright/${flow}/${state}-${project}.${extension}`

// `useLocalStorageValue` from `@react-hookz/web` round-trips values through
// `JSON.parse` / `JSON.stringify`. Setting a bare string here produced
// repeated `SyntaxError: Unexpected token 'e'` browser errors during the
// passing E2E run. Storing the JSON-encoded form restores the expected
// serialization without touching the hook itself.
const JSON_STRING_VALUE = JSON.stringify("testlogin")

const preparePage = async (page: Page, showOnboarding: boolean) => {
  await page.context().route("**/*", (route) => {
    const { hostname, pathname } = new URL(route.request().url())
    if (pathname === "/api/tokens") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ tokens: {} }),
      })
    }
    return hostname === "localhost" ? route.continue() : route.abort()
  })
  await page.addInitScript(
    ({ showOnboarding, defaultLoginMethod }) => {
      localStorage.setItem("ShowWelcomeDialog", String(showOnboarding))
      localStorage.setItem("defaultLoginMethod", defaultLoginMethod)
      localStorage.setItem("Tracking_Sentry", "denied")
      localStorage.setItem("Tracking_Amplitude", "denied")
      sessionStorage.setItem("gd-claim-view-seen", "true")
      sessionStorage.removeItem("deep_link_url")
    },
    { showOnboarding, defaultLoginMethod: JSON_STRING_VALUE },
  )
}

const login = async (page: Page) => {
  await page.goto("/en?login=master_seed")
  await page.getByRole("button", { name: "Playwright test wallet" }).click()
  await expect(page.getByText("Playwright test wallet")).toBeVisible()
}

test("captures the locale-aware onboarding and login entry", async ({
  page,
}, testInfo) => {
  await preparePage(page, true)
  await page.goto("/da?login=master_seed")

  await expect(
    page.getByText("Velkommen til din nye og forbedrede GoodWallet!"),
  ).toBeVisible()
  await page.screenshot({
    path: screenshotPath(
      "login-onboarding",
      "screenshot-onboarding-da",
      testInfo.project.name,
    ),
    fullPage: true,
  })

  await page.getByRole("button", { name: "Sign In" }).click()
  await expect(
    page.getByRole("button", { name: "Playwright test wallet" }),
  ).toBeVisible()
})

test("captures the authenticated home balance and mobile action overflow", async ({
  page,
}, testInfo) => {
  await preparePage(page, false)
  await login(page)

  await expect(page.getByText("$124.68")).toBeVisible()
  const walletActions = page.getByTestId("wallet-actions")
  await expect(walletActions).toBeVisible()

  if (testInfo.project.name === "mobile") {
    const hasOverflow = await walletActions.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    )
    expect(hasOverflow).toBe(true)
    await walletActions.evaluate((element) => {
      element.scrollLeft = element.scrollWidth
    })
  }

  await page.screenshot({
    path: screenshotPath(
      "home",
      "screenshot-home-balances-overflow-en",
      testInfo.project.name,
    ),
    fullPage: true,
  })
})

test("captures the claim verification requirement", async ({
  page,
}, testInfo) => {
  await preparePage(page, false)
  await login(page)
  await page.getByRole("link", { name: "GoodDollar" }).click()

  await expect(
    page.getByText(
      "Before you can start to claim your GoodDollars you first need to pass face verification to whitelist your account.",
    ),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Verify" })).toBeVisible()
  await page.screenshot({
    path: screenshotPath(
      "claim",
      "screenshot-claim-requires-verification-en",
      testInfo.project.name,
    ),
    fullPage: true,
  })
})
