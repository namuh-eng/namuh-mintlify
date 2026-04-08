import { expect, test } from "@playwright/test";

test.describe("Members management page", () => {
  test("navigates to members settings page", async ({ page }) => {
    await page.goto("/settings/organization/members");
    await expect(page.locator("h1")).toContainText("Members");
  });

  test("shows current members table", async ({ page }) => {
    await page.goto("/settings/organization/members");
    // Should show at least the current user as a member
    await expect(page.locator("table")).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("opens invite modal and validates email", async ({ page }) => {
    await page.goto("/settings/organization/members");
    await page.click("button:has-text('Invite')");
    // Modal should appear
    await expect(page.locator("text=Invite member")).toBeVisible();
    // Submit empty form should show error
    await page.click("button:has-text('Send invite')");
    await expect(page.locator("text=/email/i")).toBeVisible();
  });

  test("shows role badges for members", async ({ page }) => {
    await page.goto("/settings/organization/members");
    // At least one member should have a role badge
    await expect(
      page.locator("text=/admin|editor|viewer/i").first(),
    ).toBeVisible();
  });

  test("breadcrumb shows Settings / Members", async ({ page }) => {
    await page.goto("/settings/organization/members");
    await expect(page.locator("text=Settings")).toBeVisible();
    await expect(page.locator("text=Members")).toBeVisible();
  });
});
