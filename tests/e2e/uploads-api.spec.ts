import { expect, test } from "@playwright/test";

test.describe("Uploads presign API", () => {
  test("POST /api/uploads/presign returns presigned URL for valid request", async ({
    request,
  }) => {
    const response = await request.post("/api/uploads/presign", {
      data: {
        orgId: "test-org",
        projectId: "test-project",
        filename: "logo.png",
        contentType: "image/png",
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.url).toBeDefined();
    expect(body.key).toBe("test-org/test-project/assets/logo.png");
    expect(body.maxSize).toBeGreaterThan(0);
  });

  test("POST /api/uploads/presign rejects missing fields", async ({
    request,
  }) => {
    const response = await request.post("/api/uploads/presign", {
      data: { orgId: "test-org" },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Missing required fields");
  });

  test("POST /api/uploads/presign rejects disallowed content type", async ({
    request,
  }) => {
    const response = await request.post("/api/uploads/presign", {
      data: {
        orgId: "test-org",
        projectId: "test-project",
        filename: "virus.exe",
        contentType: "application/x-msdownload",
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("content type");
  });

  test("GET /api/uploads/presign returns download URL for valid key", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/uploads/presign?key=test-org/test-project/assets/logo.png",
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.url).toBeDefined();
  });

  test("GET /api/uploads/presign rejects missing key", async ({ request }) => {
    const response = await request.get("/api/uploads/presign");

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("key");
  });
});
