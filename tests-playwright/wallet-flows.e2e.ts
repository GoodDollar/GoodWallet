import { expect, type Page, test } from "@playwright/test"

const preparePage = async (page: Page, showOnboarding: boolean) => {
  await page.context().route("**/*", (route) => {
    const { hostname, pathname } = new URL(route.request().url())
    if (pathname === "/api/tokens") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ tokens: {} }),
      })
    }
    if (hostname === "fonts.googleapis.com") {
      return route.fulfill({
        contentType: "text/css",
        body: '@font-face { font-family: "Inter"; src: local("Arial"); }',
      })
    }
    return hostname === "localhost" ? route.continue() : route.abort()
  })
  await page.addInitScript(
    ({ showOnboarding }) => {
      localStorage.setItem("ShowWelcomeDialog", String(showOnboarding))
      localStorage.setItem("defaultLoginMethod", JSON.stringify("testlogin"))
      localStorage.setItem("Tracking_Sentry", "denied")
      localStorage.setItem("Tracking_Amplitude", "denied")
      sessionStorage.setItem("gd-claim-view-seen", "true")
      sessionStorage.removeItem("deep_link_url")
    },
    { showOnboarding },
  )
}

const login = async (page: Page) => {
  await page.goto("/en?login=master_seed")
  await page.getByRole("button", { name: "Playwright test wallet" }).click()
  await expect(page.getByText("Playwright test wallet")).toBeVisible()
}

test("captures the locale-aware onboarding and login entry", async ({
  page,
}) => {
  await preparePage(page, true)
  await page.goto("/da?login=master_seed")

  await expect(
    page.getByText("Velkommen til din nye og forbedrede GoodWallet!"),
  ).toBeVisible()
  await expect(page).toHaveScreenshot("login-onboarding-da.png", {
    fullPage: true,
  })

  await page.getByRole("button", { name: "Sign In" }).click()
  await expect(
    page.getByRole("button", { name: "Playwright test wallet" }),
  ).toBeVisible()
})

test("captures the authenticated home balance and responsive action grid", async ({
  page,
}, testInfo) => {
  await preparePage(page, false)
  await login(page)

  await expect(page.getByText("$124.68")).toBeVisible()
  const walletActions = page.getByTestId("wallet-actions")
  await expect(walletActions).toBeVisible()

  if (testInfo.project.name === "mobile") {
    const actionsToggle = page.getByTestId("wallet-actions-toggle")
    await expect(actionsToggle).toBeVisible()
    await actionsToggle.getByRole("button").click()
  }

  await expect(page).toHaveScreenshot("home-balances-overflow-en.png", {
    fullPage: true,
  })
})

test("captures the claim verification requirement", async ({ page }) => {
  await preparePage(page, false)
  await login(page)
  await expect(page.getByRole("link", { name: "GoodDollar" })).toHaveAttribute(
    "href",
    "/en/gooddollar",
  )
  await page.goto("/en/gooddollar")

  await expect(
    page.getByText(
      "Before you can start to claim your GoodDollars you first need to pass face verification to whitelist your account.",
    ),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Verify" })).toBeVisible()
  await expect(page).toHaveScreenshot("claim-requires-verification-en.png", {
    fullPage: true,
  })
})
