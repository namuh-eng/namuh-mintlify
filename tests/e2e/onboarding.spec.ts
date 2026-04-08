import { expect, test } from "@playwright/test";

test.describe("onboarding wizard — multi-step flow", () => {
  test.use({ storageState: "tests/e2e/.auth/user.json" });

  test("shows step 1 (org creation) on /onboarding", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(
      page.getByRole("heading", { name: /create.*organization/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/organization name/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /continue/i })).toBeVisible();
  });

  test("shows progress indicator with 4 steps", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.getByText("Organization")).toBeVisible();
    await expect(page.getByText("GitHub")).toBeVisible();
    await expect(page.getByText("Project")).toBeVisible();
    await expect(page.getByText("Complete")).toBeVisible();
  });

  test("validates empty org name on step 1", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/name is required/i)).toBeVisible();
  });

  test("step 2 shows GitHub connection with skip option", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/organization name/i).fill("Test Wizard Org");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(
      page.getByRole("heading", { name: /connect.*repository/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /skip for now/i }),
    ).toBeVisible();
  });

  test("step 3 shows project creation after skipping GitHub", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/organization name/i).fill("Test Wizard Org 2");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(
      page.getByRole("button", { name: /skip for now/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /skip for now/i }).click();
    await expect(
      page.getByRole("heading", { name: /create.*first project/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/project name/i)).toBeVisible();
  });

  test("validates empty project name on step 3", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/organization name/i).fill("Test Wizard Org 3");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: /skip for now/i }).click({
      timeout: 10000,
    });
    await page.getByRole("button", { name: /create project/i }).click();
    await expect(page.getByText(/name is required/i)).toBeVisible();
  });

  test("full wizard flow: org → skip GitHub → project → success", async ({
    page,
  }) => {
    await page.goto("/onboarding");

    // Step 1: Create org
    await page.getByLabel(/organization name/i).fill("Full Flow Org");
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 2: Skip GitHub
    await expect(
      page.getByRole("button", { name: /skip for now/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /skip for now/i }).click();

    // Step 3: Create project
    await page.getByLabel(/project name/i).fill("My Docs");
    await page.getByRole("button", { name: /create project/i }).click();

    // Step 4: Success screen
    await expect(page.getByRole("heading", { name: /all set/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole("button", { name: /go to dashboard/i }),
    ).toBeVisible();
  });

  test("back button navigates to previous step", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/organization name/i).fill("Back Test Org");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(
      page.getByRole("heading", { name: /connect.*repository/i }),
    ).toBeVisible({ timeout: 10000 });

    // Click back
    await page.getByRole("button", { name: /back/i }).click();
    await expect(
      page.getByRole("heading", { name: /create.*organization/i }),
    ).toBeVisible();
  });
});
