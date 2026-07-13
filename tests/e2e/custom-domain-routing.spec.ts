import { expect, test } from "@playwright/test";

test.describe("Custom domain Host-header routing", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("serves a verified custom domain from a spoofed Host header", async ({
    request,
  }) => {
    const customDomain = `docs-${Date.now()}.customer.test`;
    const seed = await request.post("/api/test/seed-docs-page", {
      data: { customDomain, domainVerified: true },
    });
    expect(seed.ok()).toBeTruthy();

    const response = await request.get("/introduction", {
      headers: { Host: customDomain },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["x-opendocs-resolved-host"]).toBe(customDomain);
    expect(await response.text()).toContain("This seeded page exists");
  });

  test("returns a branded 404 for unknown custom domains", async ({
    request,
  }) => {
    const response = await request.get("/introduction", {
      headers: { Host: `unknown-${Date.now()}.customer.test` },
    });

    expect(response.status()).toBe(404);
    const body = await response.text();
    expect(body).toContain("Docs site not found");
    expect(body).toContain("verified OpenDocs project");
  });
});
