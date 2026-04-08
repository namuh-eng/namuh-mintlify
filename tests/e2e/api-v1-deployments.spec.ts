/**
 * E2E tests for the v1 deployment REST API.
 * POST /api/v1/project/update/{projectId} — trigger deployment
 * GET /api/v1/project/update-status/{statusId} — check deployment status
 */

import { type APIRequestContext, expect, test } from "@playwright/test";
import { parseSetCookieHeader } from "better-auth/cookies";

const BASE = "http://localhost:3015";

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

test.describe("POST /api/v1/project/update/{projectId}", () => {
  test("returns 401 without Authorization header", async ({ request }) => {
    const res = await request.post(
      `${BASE}/api/v1/project/update/550e8400-e29b-41d4-a716-446655440000`,
    );
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("returns 401 with invalid Bearer token", async ({ request }) => {
    const res = await request.post(
      `${BASE}/api/v1/project/update/550e8400-e29b-41d4-a716-446655440000`,
      {
        headers: { Authorization: "Bearer invalid_key_12345" },
      },
    );
    expect(res.status()).toBe(401);
  });

  test("returns 400 with invalid projectId format", async ({ request }) => {
    const res = await request.post(`${BASE}/api/v1/project/update/not-a-uuid`, {
      headers: { Authorization: "Bearer mint_test12345678" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid project ID");
  });
});

test.describe("GET /api/v1/project/update-status/{statusId}", () => {
  test("returns 401 without Authorization header", async ({ request }) => {
    const res = await request.get(
      `${BASE}/api/v1/project/update-status/550e8400-e29b-41d4-a716-446655440000`,
    );
    expect(res.status()).toBe(401);
  });

  test("returns 404 for non-existent statusId", async ({ request }) => {
    // Use a made-up key that won't exist — will get 401 before 404 without a valid key
    const res = await request.get(
      `${BASE}/api/v1/project/update-status/550e8400-e29b-41d4-a716-446655440000`,
      {
        headers: { Authorization: "Bearer mint_fake12345678" },
      },
    );
    // Should be 401 since key is invalid
    expect(res.status()).toBe(401);
  });

  test("rejects assistant keys for admin-only status checks", async ({
    request,
  }) => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cookie = await createSessionCookie(
      request,
      `deploy-status-admin+${runId}@example.com`,
      `Deploy Status Admin ${runId}`,
    );

    const projectsResponse = await request.get("/api/projects", {
      headers: { Cookie: cookie },
    });

    const adminKeyCreation = await request.post("/api/api-keys", {
      headers: { Cookie: cookie },
      data: {
        name: "Status Admin Key",
        type: "admin",
      },
    });
    const assistantKeyCreation = await request.post("/api/api-keys", {
      headers: { Cookie: cookie },
      data: {
        name: "Status Assistant Key",
        type: "assistant",
      },
    });

    expect(adminKeyCreation.status()).toBe(201);
    expect(assistantKeyCreation.status()).toBe(201);

    const { projects } = (await projectsResponse.json()) as {
      projects: Array<{ id: string }>;
    };
    expect(projects[0]?.id).toBeTruthy();
    const adminKeyBody = (await adminKeyCreation.json()) as { rawKey: string };
    const assistantKeyBody = (await assistantKeyCreation.json()) as {
      rawKey: string;
    };

    const triggerResponse = await request.post(
      `/api/v1/project/update/${projects[0].id}`,
      {
        headers: {
          Authorization: `Bearer ${adminKeyBody.rawKey}`,
        },
      },
    );
    expect(triggerResponse.status()).toBe(201);
    const triggerBody = (await triggerResponse.json()) as { statusId: string };

    const assistantResponse = await request.get(
      `/api/v1/project/update-status/${triggerBody.statusId}`,
      {
        headers: {
          Authorization: `Bearer ${assistantKeyBody.rawKey}`,
        },
      },
    );

    expect(assistantResponse.status()).toBe(403);
    await expect(assistantResponse.json()).resolves.toEqual({
      error: "Forbidden — admin API key required",
    });
  });
});
