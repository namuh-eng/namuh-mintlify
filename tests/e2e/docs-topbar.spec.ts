import { expect, test } from "@playwright/test";

test.describe("Docs site topbar — feature-014a", () => {
  // Uses unauthenticated context — docs site is public
  test.use({ storageState: { cookies: [], origins: [] } });

  test("topbar renders with search button showing ⌘K", async ({ page }) => {
    await page.goto("/docs/test-project/quickstart");
    const searchBtn = page.locator(".docs-search-btn");
    await expect(searchBtn).toBeVisible();
    await expect(searchBtn.locator("kbd")).toHaveText("⌘K");
  });

  test("Ask AI button is visible in topbar", async ({ page }) => {
    await page.goto("/docs/test-project/quickstart");
    const askAiBtn = page.getByTestId("ask-ai-btn");
    await expect(askAiBtn).toBeVisible();
    await expect(askAiBtn).toHaveText(/Ask AI/);
  });

  test("Support link is visible in topbar", async ({ page }) => {
    await page.goto("/docs/test-project/quickstart");
    const supportLink = page.getByTestId("topbar-support-link");
    await expect(supportLink).toBeVisible();
    await expect(supportLink).toHaveText("Support");
  });

  test("Dashboard button is visible and links correctly", async ({ page }) => {
    await page.goto("/docs/test-project/quickstart");
    const dashboardBtn = page.getByTestId("topbar-dashboard-link");
    await expect(dashboardBtn).toBeVisible();
    await expect(dashboardBtn).toHaveText(/Dashboard/);
  });

  test("Theme toggle switches between light and dark", async ({ page }) => {
    await page.goto("/docs/test-project/quickstart");
    const toggle = page.getByTestId("theme-toggle");
    await expect(toggle).toBeVisible();

    // Default is dark
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Click to switch to light
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // Click back to dark
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("search button opens search modal on click", async ({ page }) => {
    await page.goto("/docs/test-project/quickstart");
    await page.locator(".docs-search-btn").click();
    const modal = page.getByTestId("search-modal");
    await expect(modal).toBeVisible();
  });
});
