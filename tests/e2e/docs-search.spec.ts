/**
 * E2E tests for docs site search modal (feature-016)
 */

import { expect, test } from "@playwright/test";

test.describe("Docs search modal", () => {
  test("opens search modal with Cmd+K shortcut", async ({ page }) => {
    await page.goto("/docs/test-project/getting-started");
    await page.waitForLoadState("domcontentloaded");

    // Modal should not be visible initially
    await expect(
      page.locator('[data-testid="search-modal"]'),
    ).not.toBeVisible();

    // Press Cmd+K
    await page.keyboard.press("Meta+k");

    // Modal should appear
    await expect(page.locator('[data-testid="search-modal"]')).toBeVisible();

    // Input should be focused
    const input = page.locator('[data-testid="search-input"]');
    await expect(input).toBeFocused();
  });

  test("opens search modal via search button click", async ({ page }) => {
    await page.goto("/docs/test-project/getting-started");
    await page.waitForLoadState("domcontentloaded");

    await page.locator(".docs-search-btn").click();

    await expect(page.locator('[data-testid="search-modal"]')).toBeVisible();
  });

  test("closes search modal with Escape key", async ({ page }) => {
    await page.goto("/docs/test-project/getting-started");
    await page.waitForLoadState("domcontentloaded");

    await page.keyboard.press("Meta+k");
    await expect(page.locator('[data-testid="search-modal"]')).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(
      page.locator('[data-testid="search-modal"]'),
    ).not.toBeVisible();
  });

  test("shows search results when typing a query", async ({ page }) => {
    await page.goto("/docs/test-project/getting-started");
    await page.waitForLoadState("domcontentloaded");

    await page.keyboard.press("Meta+k");
    const input = page.locator('[data-testid="search-input"]');

    await input.fill("getting");

    // Should show results (either from API or client-side)
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test("shows recent searches when modal opens with no query", async ({
    page,
  }) => {
    await page.goto("/docs/test-project/getting-started");
    await page.waitForLoadState("domcontentloaded");

    // Seed recent searches in localStorage
    await page.evaluate(() => {
      localStorage.setItem(
        "docs-recent-searches",
        JSON.stringify(["getting started", "install"]),
      );
    });

    await page.keyboard.press("Meta+k");

    // Should show recent searches section
    await expect(page.locator('[data-testid="recent-searches"]')).toBeVisible();
  });
});
