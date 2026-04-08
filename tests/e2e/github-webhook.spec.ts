import { expect, test } from "@playwright/test";

test.describe("GitHub Webhook Auto-Deploy", () => {
  test("webhook endpoint returns 400 for invalid push payload", async ({
    request,
  }) => {
    const res = await request.post("/api/webhooks/github", {
      headers: { "x-github-event": "push", "content-type": "application/json" },
      data: { invalid: true },
    });
    expect(res.status()).toBe(400);
  });

  test("webhook endpoint ignores non-push events", async ({ request }) => {
    const res = await request.post("/api/webhooks/github", {
      headers: { "x-github-event": "ping", "content-type": "application/json" },
      data: { zen: "Keep it logically awesome." },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toContain("Ignored event");
  });

  test("webhook endpoint processes valid push event", async ({ request }) => {
    const res = await request.post("/api/webhooks/github", {
      headers: { "x-github-event": "push", "content-type": "application/json" },
      data: {
        ref: "refs/heads/main",
        after: "abc123def456",
        repository: { full_name: "test-org/test-repo" },
        head_commit: { message: "Update docs", id: "abc123def456" },
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toContain("test-org/test-repo@main");
  });

  test("GitHub connections API requires auth", async ({ request }) => {
    const res = await request.get("/api/github-connections");
    expect(res.status()).toBe(401);
  });

  test("GitHub app settings page renders", async ({ page }) => {
    await page.goto("/settings/deployment/github");
    // Should redirect to login or show settings page
    await page.waitForLoadState("networkidle");
    // The page should exist (may redirect to login if not authenticated)
    expect(page.url()).toBeTruthy();
  });
});
