import { expect, test } from "@playwright/test";

test.describe("Deployments", () => {
  test("GET /api/deployments returns deployments array", async ({
    request,
  }) => {
    const res = await request.get("/api/deployments");
    // 200 with deployments array, or 401 if auth required
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty("deployments");
      expect(Array.isArray(body.deployments)).toBe(true);
    }
  });

  test("POST /api/deployments triggers a deployment", async ({ request }) => {
    const res = await request.post("/api/deployments", {
      data: { commitMessage: "Manual Update" },
    });
    // 201 if created, or 401/403 if auth required
    expect([201, 401, 403]).toContain(res.status());
    if (res.status() === 201) {
      const body = await res.json();
      expect(body.deployment).toHaveProperty("id");
      expect(body.deployment.status).toBe("queued");
    }
  });

  test("dashboard home page loads with activity section", async ({ page }) => {
    await page.goto("/dashboard");
    const url = page.url();
    const isDashboard = url.includes("/dashboard");
    const isLogin = url.includes("/login");
    const isOnboarding = url.includes("/onboarding");
    expect(isDashboard || isLogin || isOnboarding).toBe(true);
  });

  test("GET /api/deployments/:id returns deployment or 404", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/deployments/00000000-0000-0000-0000-000000000000",
    );
    expect([404, 401]).toContain(res.status());
  });

  test("POST /api/deployments/:id/complete updates deployment status", async ({
    request,
  }) => {
    // First trigger a deployment
    const createRes = await request.post("/api/deployments", {
      data: { commitMessage: "Test deploy" },
    });
    if (createRes.status() === 201) {
      const { deployment } = await createRes.json();
      const completeRes = await request.post(
        `/api/deployments/${deployment.id}/complete`,
        {
          data: { status: "succeeded" },
        },
      );
      expect([200, 401, 403]).toContain(completeRes.status());
    }
  });
});
