import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  retries: 1,
  projects: [
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "default",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["auth-setup"],
      use: {
        storageState: "tests/e2e/.auth/user.json",
      },
    },
    {
      name: "unauthenticated",
      testMatch: /auth\.spec\.ts/,
      // No storageState — tests run without session
    },
  ],
  use: {
    baseURL: "http://localhost:3015",
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    port: 3015,
    reuseExistingServer: true,
  },
});
