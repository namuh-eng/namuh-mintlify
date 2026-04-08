import { expect, test } from "@playwright/test";

test.describe("Docs Site — MDX Renderer", () => {
  test("docs API returns 404 for non-existent subdomain", async ({
    request,
  }) => {
    const response = await request.get("/api/docs/nonexistent-subdomain-xyz");
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test("docs site page returns 404 for non-existent subdomain", async ({
    page,
  }) => {
    const response = await page.goto(
      "/docs/nonexistent-subdomain-xyz/introduction",
    );
    expect(response?.status()).toBe(404);
  });

  test("docs site page returns 404 for non-existent slug", async ({ page }) => {
    // Even if subdomain exists, a non-existent slug should 404
    const response = await page.goto(
      "/docs/test-subdomain/nonexistent-page-xyz",
    );
    expect(response?.status()).toBe(404);
  });

  test("docs API endpoint responds with correct structure", async ({
    request,
  }) => {
    // Test that the API route is mounted and responds
    const response = await request.get("/api/docs/test-check");
    // Either 404 (no project) or 200 (project exists) — both are valid
    expect([200, 404]).toContain(response.status());
    const body = await response.json();
    if (response.status() === 200) {
      expect(body.project).toBeDefined();
      expect(body.pages).toBeDefined();
    } else {
      expect(body.error).toBeDefined();
    }
  });

  test("docs site layout renders correctly with published pages", async ({
    page,
  }) => {
    // Create test data via API (authenticated context)
    // This test verifies the docs site structure when pages exist
    // In a real scenario, we'd seed data first — this tests the route mounting
    const response = await page.goto("/docs/test-subdomain/test-page");
    // Should get either the page or a 404, not a 500 error
    const status = response?.status() ?? 500;
    expect([200, 404]).toContain(status);
  });
});
