import { expect, test } from "@playwright/test";

test.describe("API Keys Settings Page", () => {
  test("page loads and shows admin and assistant sections", async ({
    page,
  }) => {
    await page.goto("/settings/organization/api-keys");
    await expect(page.getByRole("heading", { name: "API keys" })).toBeVisible();
    await expect(page.getByText("Admin API keys")).toBeVisible();
    await expect(page.getByText("Assistant API keys")).toBeVisible();
  });

  test("can create an admin API key", async ({ page }) => {
    await page.goto("/settings/organization/api-keys");
    await page.getByRole("button", { name: /Create Admin API Key/i }).click();

    // Fill in the modal
    await page.getByLabel("Key name").fill("Test Admin Key");
    await page.getByRole("button", { name: /^Create$/i }).click();

    // Key should be displayed once
    await expect(page.getByText(/^mint_[a-f0-9]+$/)).toBeVisible();
    // Copy hint should be visible
    await expect(
      page.getByText(
        "Copy this key now. It will only be shown once and cannot be retrieved later.",
      ),
    ).toBeVisible();
  });

  test("can create an assistant API key", async ({ page }) => {
    await page.goto("/settings/organization/api-keys");
    await page
      .getByRole("button", { name: /Create Assistant API Key/i })
      .click();

    await page.getByLabel("Key name").fill("Test Assistant Key");
    await page.getByRole("button", { name: /^Create$/i }).click();

    // Should show assistant prefix
    await expect(page.getByText(/^mint_dsc_[a-f0-9]+$/)).toBeVisible();
  });

  test("lists created keys with masked prefix", async ({ page }) => {
    await page.goto("/settings/organization/api-keys");

    // Create a key first
    await page.getByRole("button", { name: /Create Admin API Key/i }).click();
    await page.getByLabel("Key name").fill("Visible Key");
    await page.getByRole("button", { name: /^Create$/i }).click();

    // Close the created key dialog
    await page.getByRole("button", { name: /Done|Close/i }).click();

    // Should see the key in the list with masked prefix
    const row = page.getByRole("row").filter({
      has: page.getByText("Visible Key"),
    });
    await expect(row.getByText("Visible Key")).toBeVisible();
    await expect(row.getByText(/mint_[a-f0-9]{8}\.\.\.\./)).toBeVisible();
  });

  test("shows last-used metadata for stored keys", async ({ page }) => {
    await page.goto("/settings/organization/api-keys");
    await page.getByRole("button", { name: /Create Admin API Key/i }).click();
    await page.getByLabel("Key name").fill("Last Used Key");
    await page.getByRole("button", { name: /^Create$/i }).click();
    await page.getByRole("button", { name: /Done|Close/i }).click();

    await expect(page.getByRole("columnheader", { name: "Last used" })).toHaveCount(2);

    const row = page.getByRole("row").filter({
      has: page.getByText("Last Used Key"),
    });
    await expect(row.getByText("Never")).toBeVisible();
  });

  test("can delete an API key", async ({ page }) => {
    await page.goto("/settings/organization/api-keys");

    // Create a key to delete
    await page.getByRole("button", { name: /Create Admin API Key/i }).click();
    await page.getByLabel("Key name").fill("Delete Me Key");
    await page.getByRole("button", { name: /^Create$/i }).click();
    await page.getByRole("button", { name: /Done|Close/i }).click();

    // Delete it
    await page
      .getByRole("button", { name: /Delete|Revoke/i })
      .first()
      .click();

    // Confirm deletion
    await page.getByRole("button", { name: /Confirm|Delete/i }).click();

    // Key should be gone
    await expect(page.getByText("Delete Me Key")).not.toBeVisible();
  });

  test("assistant routes require assistant keys and accept real assistant auth", async ({
    page,
    request,
  }) => {
    await page.goto("/settings/organization/api-keys");

    const adminCreation = await page.evaluate(async () => {
      const response = await fetch(`${window.location.origin}/api/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Assistant Auth Admin", type: "admin" }),
      });

      return {
        status: response.status,
        body: await response.json(),
      };
    });
    expect(adminCreation.status).toBe(201);

    const assistantCreation = await page.evaluate(async () => {
      const response = await fetch(`${window.location.origin}/api/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Assistant Auth Assistant",
          type: "assistant",
        }),
      });

      return {
        status: response.status,
        body: await response.json(),
      };
    });
    expect(assistantCreation.status).toBe(201);

    const assistantResponse = await request.post("/api/v1/assistant/search", {
      headers: {
        Authorization: `Bearer ${assistantCreation.body.rawKey}`,
      },
      data: { query: "getting started", pageSize: 3 },
    });
    expect(assistantResponse.status()).toBe(200);
    await expect(assistantResponse.json()).resolves.toEqual(expect.any(Array));

    const adminResponse = await request.post("/api/v1/assistant/search", {
      headers: {
        Authorization: `Bearer ${adminCreation.body.rawKey}`,
      },
      data: { query: "getting started", pageSize: 3 },
    });
    expect(adminResponse.status()).toBe(403);
    await expect(adminResponse.json()).resolves.toEqual({
      message: "Forbidden — assistant API key required",
    });
  });
});
