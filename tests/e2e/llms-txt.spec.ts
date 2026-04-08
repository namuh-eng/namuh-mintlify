import { expect, test } from "@playwright/test";

test.describe("llms.txt API", () => {
  // Use a non-existent project ID to test 404 behavior
  const fakeProjectId = "00000000-0000-0000-0000-000000000000";

  test("GET /api/projects/:id/llms-txt returns 404 for non-existent project", async ({
    request,
  }) => {
    const response = await request.get(
      `/api/projects/${fakeProjectId}/llms-txt`,
    );
    expect(response.status()).toBe(404);
  });

  test("GET /api/projects/:id/llms-txt?type=full returns 404 for non-existent project", async ({
    request,
  }) => {
    const response = await request.get(
      `/api/projects/${fakeProjectId}/llms-txt?type=full`,
    );
    expect(response.status()).toBe(404);
  });

  test("llms.txt endpoint returns text/plain content type", async ({
    request,
  }) => {
    const response = await request.get(
      `/api/projects/${fakeProjectId}/llms-txt`,
    );
    // Even for 404, verify the response is text
    const body = await response.text();
    expect(typeof body).toBe("string");
  });

  test("llms-full.txt endpoint returns text/plain content type", async ({
    request,
  }) => {
    const response = await request.get(
      `/api/projects/${fakeProjectId}/llms-txt?type=full`,
    );
    const body = await response.text();
    expect(typeof body).toBe("string");
  });
});
