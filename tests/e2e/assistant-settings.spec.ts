import { expect, test } from "@playwright/test";

test.describe("Assistant Settings Page", () => {
  test("renders assistant settings page with stats bar", async ({ page }) => {
    await page.goto("/products/assistant");
    const pageEl = page.locator('[data-testid="assistant-settings-page"]');
    await expect(pageEl).toBeVisible();

    // Stats bar cards
    await expect(
      page.locator('[data-testid="stat-monthly-spend"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="stat-total-questions"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="stat-answered"]')).toBeVisible();
  });

  test("shows General and Billing tabs", async ({ page }) => {
    await page.goto("/products/assistant");
    await expect(page.locator('[data-testid="tab-general"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-billing"]')).toBeVisible();
  });

  test("General tab shows Status & Control section with toggle", async ({
    page,
  }) => {
    await page.goto("/products/assistant");
    await expect(
      page.locator('[data-testid="status-control-section"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="assistant-toggle"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="assistant-status-badge"]'),
    ).toBeVisible();
  });

  test("General tab shows Response Handling with deflection controls", async ({
    page,
  }) => {
    await page.goto("/products/assistant");
    await expect(
      page.locator('[data-testid="response-handling-section"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="deflection-toggle"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="deflection-email-input"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="show-help-button-checkbox"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="save-deflection-btn"]'),
    ).toBeVisible();
  });

  test("Billing tab shows usage overview and spending controls", async ({
    page,
  }) => {
    await page.goto("/products/assistant");
    await page.locator('[data-testid="tab-billing"]').click();
    await expect(page.locator('[data-testid="billing-tab"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="usage-progress-bar"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="change-tier-btn"]')).toBeVisible();
  });
});
