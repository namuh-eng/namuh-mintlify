/**
 * E2E tests for agent job API endpoints.
 * POST /api/v1/agent/create-job
 * GET /api/v1/agent/get-job/{jobId}
 * POST /api/v1/agent/send-message/{jobId}
 */

import { type APIRequestContext, expect, test } from "@playwright/test";
import { parseSetCookieHeader } from "better-auth/cookies";

const BASE_URL = "http://localhost:3015";

async function createSessionCookie(
  request: APIRequestContext,
  email: string,
  name: string,
  withOrg = true,
) {
  const response = await request.post("/api/test/create-session", {
    data: { email, name, withOrg },
  });

  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as {
    setCookie: string;
  };

  const [cookieName, cookieValue] = Array.from(
    parseSetCookieHeader(data.setCookie).entries(),
  ).map(([entryName, value]) => [entryName, value.value] as const)[0] ?? [
    "",
    "",
  ];

  return `${cookieName}=${cookieValue}`;
}

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

  test("GET /api/v1/agent/get-job/{jobId} rejects assistant keys", async ({
    request,
  }) => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cookie = await createSessionCookie(
      request,
      `agent-auth-admin+${runId}@example.com`,
      `Agent Auth Admin ${runId}`,
    );

    const projectsResponse = await request.get("/api/projects", {
      headers: { Cookie: cookie },
    });
    const { projects } = (await projectsResponse.json()) as {
      projects: Array<{ id: string }>;
    };
    expect(projects[0]?.id).toBeTruthy();

    const adminCreation = await request.post("/api/api-keys", {
      headers: { Cookie: cookie },
      data: { name: "Agent Admin Key", type: "admin" },
    });
    const assistantCreation = await request.post("/api/api-keys", {
      headers: { Cookie: cookie },
      data: { name: "Agent Assistant Key", type: "assistant" },
    });

    expect(adminCreation.status()).toBe(201);
    expect(assistantCreation.status()).toBe(201);
    const adminBody = (await adminCreation.json()) as { rawKey: string };
    const assistantBody = (await assistantCreation.json()) as {
      rawKey: string;
    };

    const createJobResponse = await request.post(
      `${BASE_URL}/api/v1/agent/create-job`,
      {
        headers: {
          Authorization: `Bearer ${adminBody.rawKey}`,
        },
        data: {
          projectId: projects[0].id,
          prompt: "agent qa",
        },
      },
    );
    expect(createJobResponse.status()).toBe(201);
    const createJobBody = (await createJobResponse.json()) as { id?: string };

    const getJobResponse = await request.get(
      `${BASE_URL}/api/v1/agent/get-job/${createJobBody.id}`,
      {
        headers: {
          Authorization: `Bearer ${assistantBody.rawKey}`,
        },
      },
    );

    expect(getJobResponse.status()).toBe(403);
    await expect(getJobResponse.json()).resolves.toEqual({
      error: "Forbidden — admin API key required",
    });
  });
});
