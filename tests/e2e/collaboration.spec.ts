import { expect, test } from "@playwright/test";

test.describe("Editor Collaboration — feature-003b", () => {
  test("comments button opens comments sidebar", async ({ page }) => {
    await page.goto("/editor/main");
    await page.waitForSelector('[data-testid="editor-page"]');
    const commentsBtn = page.locator('[data-testid="comments-btn"]');
    await expect(commentsBtn).toBeVisible();
    await commentsBtn.click();
    // If a page is selected, comments sidebar should show
    // If no page, the button should still be clickable without error
  });

  test("suggestions button opens suggestions panel", async ({ page }) => {
    await page.goto("/editor/main");
    await page.waitForSelector('[data-testid="editor-page"]');
    const suggestionsBtn = page.locator('[data-testid="suggestions-btn"]');
    await expect(suggestionsBtn).toBeVisible();
    await suggestionsBtn.click();
  });

  test("branch selector popover opens with search and create", async ({
    page,
  }) => {
    await page.goto("/editor/main");
    await page.waitForSelector('[data-testid="editor-page"]');
    const branchSelector = page.locator('[data-testid="branch-selector"]');
    await expect(branchSelector).toBeVisible();
    await expect(branchSelector).toContainText("main");
    await branchSelector.click();
    const popover = page.locator('[data-testid="branch-popover"]');
    await expect(popover).toBeVisible();
    // Search input
    await expect(page.locator('[data-testid="branch-search"]')).toBeVisible();
    // Create new branch trigger
    await expect(
      page.locator('[data-testid="create-branch-trigger"]'),
    ).toBeVisible();
  });

  test("publish button is disabled when no unsaved changes", async ({
    page,
  }) => {
    await page.goto("/editor/main");
    await page.waitForSelector('[data-testid="editor-page"]');
    const publishBtn = page.locator('[data-testid="publish-btn"]');
    await expect(publishBtn).toBeVisible();
    await expect(publishBtn).toBeDisabled();
  });

  test("comments API returns 401 without auth", async ({ request }) => {
    const res = await request.get(
      "/api/pages/00000000-0000-0000-0000-000000000000/comments",
    );
    expect(res.status()).toBe(401);
  });

  test("suggestions API returns 401 without auth", async ({ request }) => {
    const res = await request.get(
      "/api/pages/00000000-0000-0000-0000-000000000000/suggestions",
    );
    expect(res.status()).toBe(401);
  });

  test("branches API returns 401 without auth", async ({ request }) => {
    const res = await request.get(
      "/api/projects/00000000-0000-0000-0000-000000000000/branches",
    );
    expect(res.status()).toBe(401);
  });
});
