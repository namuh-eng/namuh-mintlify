import { test as setup } from "@playwright/test";

const AUTH_FILE = "tests/e2e/.auth/user.json";

setup("create authenticated session", async ({ request }) => {
  // Create a test user session via the test-only API route
  const response = await request.post("/api/test/create-session", {
    data: {
      email: "e2e-test@example.com",
      name: "E2E Test User",
    },
  });

  // Save the auth state (cookies) for reuse in authenticated tests
  await request.storageState({ path: AUTH_FILE });
});
