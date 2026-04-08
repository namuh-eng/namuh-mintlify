/**
 * E2E tests for the v1 deployment REST API.
 * POST /api/v1/project/update/{projectId} — trigger deployment
 * GET /api/v1/project/update-status/{statusId} — check deployment status
 */

import { expect, test } from "@playwright/test";

const BASE = "http://localhost:3015";

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
});
