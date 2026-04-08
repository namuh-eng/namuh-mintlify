import { expect, test } from "@playwright/test";

test.describe("settings-006: Danger zone", () => {
  test("danger zone page loads with correct heading", async ({ page }) => {
    await page.goto("/settings/advanced/danger");
    await expect(
      page.getByRole("heading", { name: "Danger Zone" }),
    ).toBeVisible();
  });

  test("shows delete deployment section with reason textarea", async ({
    page,
  }) => {
    await page.goto("/settings/advanced/danger");
    await expect(
      page.getByRole("heading", { name: /delete deployment/i }),
    ).toBeVisible();
    await expect(page.locator("#deploy-reason")).toBeVisible();
  });

  test("shows delete organization section with critical warning", async ({
    page,
  }) => {
    await page.goto("/settings/advanced/danger");
    await expect(
      page.getByRole("heading", { name: /delete organization/i }),
    ).toBeVisible();
    await expect(page.getByText("CRITICAL ACTION")).toBeVisible();
  });

  test("delete deployment button is disabled without reason", async ({
    page,
  }) => {
    await page.goto("/settings/advanced/danger");
    const deleteBtn = page
      .locator("section")
      .first()
      .getByRole("button", { name: /delete/i });
    await expect(deleteBtn).toBeDisabled();
  });

  test("delete deployment button enables after entering reason", async ({
    page,
  }) => {
    await page.goto("/settings/advanced/danger");
    await page
      .locator("#deploy-reason")
      .fill("No longer needed for this project");
    const deleteBtn = page
      .locator("section")
      .first()
      .getByRole("button", { name: /delete/i });
    await expect(deleteBtn).toBeEnabled();
  });

  test("clicking delete deployment opens confirmation dialog", async ({
    page,
  }) => {
    await page.goto("/settings/advanced/danger");
    await page.locator("#deploy-reason").fill("Removing old deployment");
    const deleteBtn = page
      .locator("section")
      .first()
      .getByRole("button", { name: /delete/i });
    await deleteBtn.click();
    await expect(page.getByText("Confirm deployment deletion")).toBeVisible();
  });

  test("confirmation dialog requires typing name to confirm", async ({
    page,
  }) => {
    await page.goto("/settings/advanced/danger");
    await page.locator("#deploy-reason").fill("Removing old deployment");
    const deleteBtn = page
      .locator("section")
      .first()
      .getByRole("button", { name: /delete/i });
    await deleteBtn.click();

    // Permanently delete button should be disabled
    const confirmBtn = page.getByRole("button", {
      name: /permanently delete/i,
    });
    await expect(confirmBtn).toBeDisabled();
  });

  test("cancel button closes confirmation dialog", async ({ page }) => {
    await page.goto("/settings/advanced/danger");
    await page.locator("#deploy-reason").fill("Removing old deployment");
    const deleteBtn = page
      .locator("section")
      .first()
      .getByRole("button", { name: /delete/i });
    await deleteBtn.click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByText("Confirm deployment deletion"),
    ).not.toBeVisible();
  });
});
