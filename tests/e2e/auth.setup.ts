import { expect, test as setup } from "@playwright/test";
import { parseSetCookieHeader } from "better-auth/cookies";

const AUTH_FILE = "tests/e2e/.auth/user.json";

setup("create authenticated session", async ({ page, request, baseURL }) => {
  // Create a test user session via the test-only API route
  const email = `e2e-test+${Date.now()}@example.com`;
  const response = await request.post("/api/test/create-session", {
    data: {
      email,
      name: "E2E Test User",
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as {
    setCookie: string;
    expiresAt: string;
  };
  const [cookieName, cookieValue] = Array.from(
    parseSetCookieHeader(data.setCookie).entries(),
  ).map(([name, value]) => [name, value.value] as const)[0] ?? ["", ""];

  await page.context().addCookies([
    {
      name: cookieName,
      value: cookieValue,
      url: baseURL ?? "http://localhost:3015",
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(new Date(data.expiresAt).getTime() / 1000),
    },
  ]);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);

  // Save the auth state (cookies) for reuse in authenticated tests
  await page.context().storageState({ path: AUTH_FILE });
});
