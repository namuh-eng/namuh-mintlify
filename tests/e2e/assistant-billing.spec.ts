import { expect, test } from "@playwright/test";

test.describe("Assistant Billing Tab", () => {
  test("displays usage progress bar with percentage text", async ({ page }) => {
    await page.goto("/products/assistant");
    await page.locator('[data-testid="tab-billing"]').click();
    const billingTab = page.locator('[data-testid="billing-tab"]');
    await expect(billingTab).toBeVisible();

    // Progress bar visible
    await expect(
      page.locator('[data-testid="usage-progress-bar"]'),
    ).toBeVisible();

    // Usage text shows percentage and message count
    await expect(
      billingTab.getByText(/\d+%.*\d+ of \d+.*messages used/),
    ).toBeVisible();
  });

  test("shows usage legend with Used count and Overage Kick In", async ({
    page,
  }) => {
    await page.goto("/products/assistant");
    await page.locator('[data-testid="tab-billing"]').click();
    const billingTab = page.locator('[data-testid="billing-tab"]');

    await expect(billingTab.getByText(/Used:/)).toBeVisible();
    await expect(billingTab.getByText("Overage Kick In")).toBeVisible();
  });

  test("shows stats grid with Message Range and Messages Remaining", async ({
    page,
  }) => {
    await page.goto("/products/assistant");
    await page.locator('[data-testid="tab-billing"]').click();
    const billingTab = page.locator('[data-testid="billing-tab"]');

    await expect(billingTab.getByText("Message Range")).toBeVisible();
    await expect(billingTab.getByText("Messages Remaining")).toBeVisible();
  });

  test("shows stats grid with Next Billing, Monthly Price, Overage Spend", async ({
    page,
  }) => {
    await page.goto("/products/assistant");
    await page.locator('[data-testid="tab-billing"]').click();
    const billingTab = page.locator('[data-testid="billing-tab"]');

    await expect(billingTab.getByText("Next Billing")).toBeVisible();
    await expect(billingTab.getByText("Monthly Price")).toBeVisible();
    await expect(billingTab.getByText("Overage Spend")).toBeVisible();
  });

  test("shows Spending Controls section with Change Tier button", async ({
    page,
  }) => {
    await page.goto("/products/assistant");
    await page.locator('[data-testid="tab-billing"]').click();

    await expect(page.getByText("Spending Controls")).toBeVisible();
    await expect(page.locator('[data-testid="change-tier-btn"]')).toBeVisible();
  });
});
