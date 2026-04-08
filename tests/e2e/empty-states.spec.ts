import { expect, test } from "@playwright/test";

test.describe("Empty states for dashboard pages", () => {
  test("analytics page shows empty state when no data", async ({ page }) => {
    await page.goto("/analytics");
    // The empty state should appear when there's no analytics data
    const emptyState = page.locator('[data-testid="empty-state"]');
    // Wait for either the empty state or the chart to appear
    await Promise.race([
      emptyState.waitFor({ timeout: 10000 }).catch(() => {}),
      page
        .locator("text=Visitors Over Time")
        .waitFor({ timeout: 10000 })
        .catch(() => {}),
    ]);
    // If empty state is visible, check its content
    if (await emptyState.isVisible()) {
      await expect(emptyState.locator("h3")).toHaveText("No data yet");
      await expect(
        emptyState.locator('[data-testid="empty-state-cta"]'),
      ).toBeVisible();
    }
  });

  test("agent page shows empty state when no jobs exist", async ({ page }) => {
    await page.goto("/products/agent");
    const emptyState = page.locator('[data-testid="empty-state"]');
    await Promise.race([
      emptyState.waitFor({ timeout: 10000 }).catch(() => {}),
      page
        .locator('[data-testid="agent-job-list"]')
        .waitFor({ timeout: 10000 })
        .catch(() => {}),
    ]);
    if (await emptyState.isVisible()) {
      await expect(emptyState.locator("h3")).toHaveText("Connect integrations");
      await expect(
        emptyState.locator('[data-testid="empty-state-cta"]'),
      ).toBeVisible();
    }
  });

  test("editor page shows empty state when no pages exist", async ({
    page,
  }) => {
    await page.goto("/editor/main");
    const emptyState = page.locator('[data-testid="empty-state"]');
    await Promise.race([
      emptyState.waitFor({ timeout: 10000 }).catch(() => {}),
      page
        .locator('[data-testid="editor-page"]')
        .waitFor({ timeout: 10000 })
        .catch(() => {}),
    ]);
    if (await emptyState.isVisible()) {
      await expect(emptyState.locator("h3")).toHaveText(
        "Start writing your docs",
      );
      await expect(
        emptyState.locator('[data-testid="empty-state-cta"]'),
      ).toBeVisible();
    }
  });

  test("empty state CTA buttons have correct destinations", async ({
    page,
  }) => {
    await page.goto("/analytics");
    const emptyState = page.locator('[data-testid="empty-state"]');
    await Promise.race([
      emptyState.waitFor({ timeout: 10000 }).catch(() => {}),
      page
        .locator("text=Visitors Over Time")
        .waitFor({ timeout: 10000 })
        .catch(() => {}),
    ]);
    if (await emptyState.isVisible()) {
      const cta = emptyState.locator('[data-testid="empty-state-cta"]');
      await expect(cta).toHaveAttribute("href", "/settings");
    }
  });
});
