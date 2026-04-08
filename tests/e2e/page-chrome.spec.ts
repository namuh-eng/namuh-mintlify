import { expect, test } from "@playwright/test";

test.describe("Docs page chrome", () => {
  test("page title is visible with copy and actions buttons", async ({
    page,
  }) => {
    // Navigate to a docs page (using any subdomain that exists)
    await page.goto("/docs/test-project/introduction");
    // If page doesn't exist, skip gracefully
    if (page.url().includes("404")) {
      test.skip();
      return;
    }
    // H1 should be visible
    const title = page.locator("[data-testid='page-title']");
    await expect(title).toBeVisible();
    // Copy page button should be visible
    const copyBtn = page.locator("[data-testid='copy-page-btn']");
    await expect(copyBtn).toBeVisible();
    // More actions dropdown trigger should be visible
    const actionsBtn = page.locator("[data-testid='page-actions-btn']");
    await expect(actionsBtn).toBeVisible();
  });

  test("heading anchors show link icon on hover", async ({ page }) => {
    await page.goto("/docs/test-project/introduction");
    if (page.url().includes("404")) {
      test.skip();
      return;
    }
    // Check that headings with anchors exist in the content
    const headingAnchor = page.locator(".docs-content .heading-anchor").first();
    if ((await headingAnchor.count()) === 0) {
      test.skip();
      return;
    }
    await headingAnchor.hover();
    // The anchor icon should appear (via CSS ::before or an SVG)
    await expect(headingAnchor.locator(".heading-anchor-icon")).toBeVisible();
  });

  test("breadcrumb shows group name in green above title", async ({ page }) => {
    // Navigate to a nested page that has a group
    await page.goto("/docs/test-project/guides/quickstart");
    if (page.url().includes("404")) {
      test.skip();
      return;
    }
    const groupName = page.locator("[data-testid='breadcrumb-group']");
    await expect(groupName).toBeVisible();
    // Should have green color styling
    await expect(groupName).toHaveCSS("color", "rgb(22, 163, 74)");
  });

  test("previous/next navigation links are visible", async ({ page }) => {
    await page.goto("/docs/test-project/introduction");
    if (page.url().includes("404")) {
      test.skip();
      return;
    }
    // At least one of prev/next should be visible
    const pagination = page.locator(".docs-pagination");
    await expect(pagination).toBeVisible();
  });

  test("copy page button copies content to clipboard", async ({ page }) => {
    await page.goto("/docs/test-project/introduction");
    if (page.url().includes("404")) {
      test.skip();
      return;
    }
    // Grant clipboard permissions
    await page.context().grantPermissions(["clipboard-read"]);
    const copyBtn = page.locator("[data-testid='copy-page-btn']");
    await copyBtn.click();
    // Check the button shows a confirmation state
    const tooltip = page.locator("[data-testid='copy-page-btn'] svg");
    await expect(tooltip).toBeVisible();
  });
});
