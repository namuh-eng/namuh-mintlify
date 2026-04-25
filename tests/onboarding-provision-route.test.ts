import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeNextRequest(url: string, init: RequestInit = {}): NextRequest {
  const request = new Request(url, init) as NextRequest;
  Object.defineProperty(request, "nextUrl", {
    value: new URL(url),
    configurable: true,
  });
  return request;
}

const getSessionMock = vi.fn();
const headersMock = vi.fn();
const selectMock = vi.fn();
const insertMock = vi.fn();
const resolveGitHubImportAccessForProjectMock = vi.fn();
const getGitHubImportAccessMessageMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/github-import", () => ({
  resolveGitHubImportAccessForProject: resolveGitHubImportAccessForProjectMock,
  getGitHubImportAccessMessage: getGitHubImportAccessMessageMock,
}));

describe("POST /api/onboarding/provision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    resolveGitHubImportAccessForProjectMock.mockResolvedValue({ status: "no_repo" });
    getGitHubImportAccessMessageMock.mockReturnValue(null);
  });

  it("returns 401 when unauthenticated", async () => {
    getSessionMock.mockResolvedValue(null);
    const { POST } = await import("@/app/api/onboarding/provision/route");
    const response = await POST(makeNextRequest("http://localhost/api/onboarding/provision", {
      method: "POST",
      body: JSON.stringify({ projectId: "proj-1" })
    }));
    expect(response.status).toBe(401);
  });

  it("provisions initial pages for a new project", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    
    const membershipLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };
    
    const projectLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: "proj-1" }]),
    };

    const pagesLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]), // no pages yet
    };

    selectMock
      .mockReturnValueOnce(membershipLookup)
      .mockReturnValueOnce(projectLookup)
      .mockReturnValueOnce(pagesLookup);

    const valuesMock = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValue({ values: valuesMock });

    const { POST } = await import("@/app/api/onboarding/provision/route");
    const response = await POST(makeNextRequest("http://localhost/api/onboarding/provision", {
      method: "POST",
      body: JSON.stringify({ projectId: "proj-1" })
    }));

    expect(response.status).toBe(200);
    expect(valuesMock).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ path: "introduction" }),
      expect.objectContaining({ path: "quickstart" }),
    ]));
  });

  it("returns 409 if github auth is required for repo-backed import", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    const membershipLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };

    const projectLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: "proj-1" }]),
    };

    const pagesLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    selectMock
      .mockReturnValueOnce(membershipLookup)
      .mockReturnValueOnce(projectLookup)
      .mockReturnValueOnce(pagesLookup);

    resolveGitHubImportAccessForProjectMock.mockResolvedValue({
      status: "private_auth_required",
    });
    getGitHubImportAccessMessageMock.mockReturnValue(
      "Connect GitHub before importing docs from a private repository",
    );

    const { POST } = await import("@/app/api/onboarding/provision/route");
    const response = await POST(makeNextRequest("http://localhost/api/onboarding/provision", {
      method: "POST",
      body: JSON.stringify({ projectId: "proj-1" })
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Connect GitHub before importing docs from a private repository",
      githubImportAccess: { status: "private_auth_required" },
    });
  });

  it("returns 409 if the project already has content", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    
    const membershipLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };
    
    const projectLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: "proj-1" }]),
    };

    const pagesLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: "page-1" }]), // already has pages
    };

    selectMock
      .mockReturnValueOnce(membershipLookup)
      .mockReturnValueOnce(projectLookup)
      .mockReturnValueOnce(pagesLookup);

    const { POST } = await import("@/app/api/onboarding/provision/route");
    const response = await POST(makeNextRequest("http://localhost/api/onboarding/provision", {
      method: "POST",
      body: JSON.stringify({ projectId: "proj-1" })
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "Project already has content" });
  });
});
