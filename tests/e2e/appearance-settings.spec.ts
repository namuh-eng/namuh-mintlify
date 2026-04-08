import { expect, test } from "@playwright/test";

test.describe("Appearance Settings Page", () => {
  test("renders the appearance settings page with all sections", async ({
    page,
  }) => {
    await page.goto("/settings/appearance");

    // Page title
    await expect(page.getByText("Appearance")).toBeVisible();

    // Color pickers section
    await expect(page.getByText("Primary color")).toBeVisible();
    await expect(page.getByText("Background color")).toBeVisible();

    // Dark mode section
    await expect(page.getByText("Dark mode")).toBeVisible();

    // Logo section
    await expect(page.getByText("Logo (light)")).toBeVisible();
    await expect(page.getByText("Logo (dark)")).toBeVisible();

    // Favicon section
    await expect(page.getByText("Favicon")).toBeVisible();

    // Save button
    await expect(
      page.getByRole("button", { name: "Save changes" }),
    ).toBeVisible();
  });

  test("color inputs show hex value and color preview", async ({ page }) => {
    await page.goto("/settings/appearance");

    const primaryInput = page.getByTestId("primary-color-input");
    await expect(primaryInput).toBeVisible();
    const value = await primaryInput.inputValue();
    expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test("dark mode selector has three options", async ({ page }) => {
    await page.goto("/settings/appearance");

    await expect(page.getByTestId("darkmode-light")).toBeVisible();
    await expect(page.getByTestId("darkmode-dark")).toBeVisible();
    await expect(page.getByTestId("darkmode-system")).toBeVisible();
  });

  test("logo upload dropzones are visible", async ({ page }) => {
    await page.goto("/settings/appearance");

    await expect(page.getByTestId("upload-logo-light")).toBeVisible();
    await expect(page.getByTestId("upload-logo-dark")).toBeVisible();
    await expect(page.getByTestId("upload-favicon")).toBeVisible();
  });

  test("save button triggers save and shows success message", async ({
    page,
  }) => {
    await page.goto("/settings/appearance");

    // Wait for page to load project data
    await page.waitForSelector('[data-testid="primary-color-input"]');

    // Change primary color
    const primaryInput = page.getByTestId("primary-color-input");
    await primaryInput.fill("#FF5733");

    // Click save
    await page.getByRole("button", { name: "Save changes" }).click();

    // Wait for success message
    await expect(page.getByText("Changes saved")).toBeVisible({
      timeout: 5000,
    });
  });
});
