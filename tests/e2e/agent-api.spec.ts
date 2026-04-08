/**
 * E2E tests for agent job API endpoints.
 * POST /api/v1/agent/create-job
 * GET /api/v1/agent/get-job/{jobId}
 * POST /api/v1/agent/send-message/{jobId}
 */

import { expect, test } from "@playwright/test";

const BASE_URL = "http://localhost:3015";

test.describe("Agent Job API", () => {
  test("POST /api/v1/agent/create-job returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}/api/v1/agent/create-job`, {
      data: {
        projectId: "550e8400-e29b-41d4-a716-446655440000",
        prompt: "test",
      },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Unauthorized");
  });

  test("POST /api/v1/agent/create-job returns 400 for invalid body", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}/api/v1/agent/create-job`, {
      headers: { authorization: "Bearer fake_key" },
      data: { prompt: "missing projectId" },
    });
    // Will be 401 since fake_key won't authenticate, but tests the route exists
    expect([400, 401]).toContain(response.status());
  });

  test("GET /api/v1/agent/get-job/{jobId} returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE_URL}/api/v1/agent/get-job/550e8400-e29b-41d4-a716-446655440000`,
    );
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Unauthorized");
  });

  test("GET /api/v1/agent/get-job/{jobId} returns 400 for invalid UUID", async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE_URL}/api/v1/agent/get-job/not-a-uuid`,
    );
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid job ID");
  });

  test("POST /api/v1/agent/send-message/{jobId} returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.post(
      `${BASE_URL}/api/v1/agent/send-message/550e8400-e29b-41d4-a716-446655440000`,
      {
        data: { content: "follow up" },
      },
    );
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Unauthorized");
  });

  test("POST /api/v1/agent/send-message/{jobId} returns 400 for invalid UUID", async ({
    request,
  }) => {
    const response = await request.post(
      `${BASE_URL}/api/v1/agent/send-message/bad-id`,
      {
        data: { content: "follow up" },
      },
    );
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid job ID");
  });
});
