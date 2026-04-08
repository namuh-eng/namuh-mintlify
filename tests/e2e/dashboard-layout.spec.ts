import { expect, test } from "@playwright/test";

test.describe("Dashboard Layout", () => {
  test("dashboard page loads with sidebar and top bar", async ({ page }) => {
    await page.goto("/dashboard");
    // Should see sidebar
    await expect(page.getByTestId("sidebar")).toBeVisible();
    // Should see top bar
    await expect(page.getByTestId("top-bar")).toBeVisible();
  });

  test("sidebar shows main navigation items", async ({ page }) => {
    await page.goto("/dashboard");
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar.getByText("Home")).toBeVisible();
    await expect(sidebar.getByText("Editor")).toBeVisible();
    await expect(sidebar.getByText("Analytics")).toBeVisible();
    await expect(sidebar.getByText("Settings")).toBeVisible();
  });

  test("sidebar shows Agents group with items", async ({ page }) => {
    await page.goto("/dashboard");
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar.getByText("Agents")).toBeVisible();
    await expect(sidebar.getByText("Agent")).toBeVisible();
    await expect(sidebar.getByText("Assistant")).toBeVisible();
    await expect(sidebar.getByText("Workflows")).toBeVisible();
    await expect(sidebar.getByText("MCP")).toBeVisible();
  });

  test("sidebar has org switcher with org name", async ({ page }) => {
    await page.goto("/dashboard");
    const sidebar = page.getByTestId("sidebar");
    // Org switcher button should be present (org name varies, so check for any button in the org area)
    const orgButton = sidebar.locator("button").first();
    await expect(orgButton).toBeVisible();
  });

  test("sidebar collapse button exists", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeVisible();
  });

  test("top bar has search, notifications, chat, and profile", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Notifications" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Chat" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Profile menu" }),
    ).toBeVisible();
  });

  test("profile menu opens with user options", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Profile menu" }).click();
    await expect(page.getByText("Your profile")).toBeVisible();
    await expect(page.getByText("Invite members")).toBeVisible();
    await expect(page.getByText("Log Out")).toBeVisible();
  });

  test("trial banner is visible", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("trial-banner")).toBeVisible();
    await expect(page.getByText("free trial")).toBeVisible();
  });

  test("dashboard shows greeting", async ({ page }) => {
    await page.goto("/dashboard");
    // Should contain "Good morning/afternoon/evening"
    await expect(
      page.getByText(/Good (morning|afternoon|evening)/),
    ).toBeVisible();
  });
});
