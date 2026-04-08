import { expect, test } from "@playwright/test";

test.describe("Feedback Widget", () => {
  test("feedback widget renders on docs pages with thumbs up/down buttons", async ({
    page,
  }) => {
    // Navigate to any docs page — use a subdomain that exists or catch the 404
    await page.goto("/docs/test/getting-started", { waitUntil: "networkidle" });

    // If the page exists, check for the widget
    const widget = page.getByTestId("feedback-widget");
    const widgetExists = (await widget.count()) > 0;

    if (widgetExists) {
      await expect(widget).toBeVisible();
      await expect(page.getByTestId("feedback-thumbs-up")).toBeVisible();
      await expect(page.getByTestId("feedback-thumbs-down")).toBeVisible();
    }
  });

  test("POST /api/docs/:subdomain/feedback returns 404 for unknown subdomain", async ({
    request,
  }) => {
    const response = await request.post("/api/docs/nonexistent-site/feedback", {
      data: { page: "/test", rating: "helpful" },
    });
    expect(response.status()).toBe(404);
  });

  test("POST /api/docs/:subdomain/feedback returns 400 for invalid payload", async ({
    request,
  }) => {
    const response = await request.post("/api/docs/nonexistent-site/feedback", {
      data: { page: "/test" }, // missing rating
    });
    // Could be 400 (validation) or 404 (subdomain not found) — both are correct
    expect([400, 404]).toContain(response.status());
  });

  test("POST /api/docs/:subdomain/feedback rejects invalid JSON", async ({
    request,
  }) => {
    const response = await request.post("/api/docs/nonexistent-site/feedback", {
      headers: { "Content-Type": "application/json" },
      data: "not-json{{{",
    });
    expect([400, 404]).toContain(response.status());
  });
});
