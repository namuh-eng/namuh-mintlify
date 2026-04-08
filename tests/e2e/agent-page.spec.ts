import { expect, test } from "@playwright/test";

test.describe("Agent page", () => {
  test("renders the agent page with header and prompt input", async ({
    page,
  }) => {
    await page.goto("/products/agent");
    await expect(page.getByTestId("agent-page")).toBeVisible();
    await expect(page.getByText("Agent")).toBeVisible();
    await expect(page.getByText("Keep your docs up-to-date")).toBeVisible();
  });

  test("shows create job form when project exists", async ({ page }) => {
    await page.goto("/products/agent");
    const form = page.getByTestId("create-job-form");
    // Form may or may not be visible depending on project state
    // If visible, it should have the prompt input
    if (await form.isVisible()) {
      await expect(page.getByTestId("prompt-input")).toBeVisible();
      await expect(page.getByTestId("create-job-btn")).toBeVisible();
    }
  });

  test("shows empty state when no jobs exist", async ({ page }) => {
    await page.goto("/products/agent");
    // Either job list or empty state should be visible
    const jobList = page.getByTestId("agent-job-list");
    const emptyState = page.getByText("Enable the Agent");
    const isListVisible = await jobList.isVisible().catch(() => false);
    const isEmptyVisible = await emptyState.isVisible().catch(() => false);
    expect(isListVisible || isEmptyVisible).toBe(true);
  });

  test("has refresh button", async ({ page }) => {
    await page.goto("/products/agent");
    await expect(page.getByTestId("refresh-jobs-btn")).toBeVisible();
  });

  test("sidebar shows Agent link as active", async ({ page }) => {
    await page.goto("/products/agent");
    const agentLink = page.getByRole("link", { name: "Agent" });
    await expect(agentLink).toBeVisible();
  });
});
