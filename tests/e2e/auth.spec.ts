import { expect, test } from "@playwright/test";

test.describe("auth-001: authentication flow", () => {
  test("login page renders with email/password available", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText(/sign in|log in|welcome/i);
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
    await expect(page.getByLabel(/work email/i)).toBeVisible();
    await expect(page.getByLabel(/^password/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^continue/i }),
    ).toBeVisible();
  });

  test("signup page renders with email/password available", async ({
    page,
  }) => {
    await page.goto("/signup");
    await expect(page.locator("h1")).toContainText(
      /sign up|create|get started|make your docs/i,
    );
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/work email/i)).toBeVisible();
    await expect(page.getByLabel(/^password/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create workspace/i }),
    ).toBeVisible();
  });

  test("signup can create an account through the visible email/password UI", async ({
    page,
  }) => {
    const email = `e2e-signup+${Date.now()}@example.com`;

    await page.goto("/signup?returnTo=/dashboard");
    await page.getByLabel(/name/i).fill("E2E Signup User");
    await page.getByLabel(/work email/i).fill(email);
    await page.getByLabel(/^password/i).fill("password123");
    await page.getByRole("button", { name: /create workspace/i }).click();

    await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/(dashboard|onboarding)/);
  });

  test("unauthenticated user is redirected from dashboard to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login?returnTo=%2Fdashboard");
  });

  test("unauthenticated user is redirected from settings to login", async ({
    page,
  }) => {
    await page.goto("/settings/general");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login?returnTo=%2Fsettings%2Fgeneral");
  });

  test("auth API session endpoint returns unauthenticated", async ({
    request,
  }) => {
    const res = await request.get("/api/auth/get-session");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeNull();
  });
});
