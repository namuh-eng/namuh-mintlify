import { expect, test } from "@playwright/test";

test.describe("Profile settings page", () => {
  test.use({ storageState: "tests/e2e/.auth/user.json" });

  test("loads profile page with user name fields", async ({ page }) => {
    await page.goto("/settings/workspace/profile");
    await expect(page.getByText("My Profile")).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
  });

  test("saves name changes and shows success message", async ({ page }) => {
    await page.goto("/settings/workspace/profile");
    const firstNameInput = page.locator('input[name="firstName"]');
    const lastNameInput = page.locator('input[name="lastName"]');

    await firstNameInput.fill("TestFirst");
    await lastNameInput.fill("TestLast");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Changes saved")).toBeVisible();
  });

  test("displays notification toggle for comment reply emails", async ({
    page,
  }) => {
    await page.goto("/settings/workspace/profile");
    await expect(page.getByText("Comment reply emails")).toBeVisible();
    // Toggle should be present
    await expect(
      page.locator('[role="switch"][aria-label="Comment reply emails"]'),
    ).toBeVisible();
  });

  test("displays GitHub integration section", async ({ page }) => {
    await page.goto("/settings/workspace/profile");
    await expect(page.getByText("Integrations")).toBeVisible();
    await expect(page.getByText("GitHub")).toBeVisible();
  });

  test("rejects empty first name", async ({ page }) => {
    await page.goto("/settings/workspace/profile");
    const firstNameInput = page.locator('input[name="firstName"]');
    await firstNameInput.fill("");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("First name is required")).toBeVisible();
  });
});
