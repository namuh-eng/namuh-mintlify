import { expect, test } from "@playwright/test";

test.describe("Configurations Panel", () => {
  test("editor page shows Config tab", async ({ page }) => {
    await page.goto("/editor/main");
    const tab = page.getByTestId("configs-tab");
    await expect(tab).toBeVisible();
    await expect(tab).toContainText("Config");
  });

  test("clicking Config tab shows configurations panel", async ({ page }) => {
    await page.goto("/editor/main");
    await page.getByTestId("configs-tab").click();
    const panel = page.getByTestId("configs-panel");
    await expect(panel).toBeVisible();
  });

  test("configurations panel has 10 accordion sections", async ({ page }) => {
    await page.goto("/editor/main");
    await page.getByTestId("configs-tab").click();
    await page.waitForSelector('[data-testid="configs-panel"]');

    const sections = [
      "overview",
      "visual-branding",
      "typography",
      "header-topbar",
      "footer",
      "content-features",
      "assistant-search",
      "integrations",
      "api-docs",
      "advanced",
    ];

    for (const s of sections) {
      await expect(page.getByTestId(`config-section-${s}`)).toBeVisible();
    }
  });

  test("has export and import buttons", async ({ page }) => {
    await page.goto("/editor/main");
    await page.getByTestId("configs-tab").click();
    await expect(page.getByTestId("config-export-btn")).toBeVisible();
    await expect(page.getByTestId("config-import-btn")).toBeVisible();
  });

  test("has save changes button", async ({ page }) => {
    await page.goto("/editor/main");
    await page.getByTestId("configs-tab").click();
    await expect(page.getByTestId("config-save-btn")).toBeVisible();
    await expect(page.getByTestId("config-save-btn")).toContainText(
      "Save changes",
    );
  });
});
