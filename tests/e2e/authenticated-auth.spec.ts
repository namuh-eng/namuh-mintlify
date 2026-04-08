import { expect, test } from "@playwright/test";

test.describe("auth-001: authenticated auth-page redirects", () => {
  test("authenticated user visiting login is redirected to dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForURL(/\/dashboard/);
    expect(page.url()).toContain("/dashboard");
  });

  test("authenticated user visiting signup with returnTo keeps the destination", async ({
    page,
  }) => {
    await page.goto("/signup?returnTo=%2Fsettings%2Fgeneral");
    await page.waitForURL(/\/settings\/general/);
    expect(page.url()).toContain("/settings/general");
  });
});
