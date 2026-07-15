import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const headersMock = vi.fn();
const selectMock = vi.fn();
const canCreateProjectForOrganizationMock = vi.fn();
const readOrganizationBillingMock = vi.fn();
const canUseCustomDomainsMock = vi.fn();
const recordAssistantMessageUsageMock = vi.fn();
const streamAssistantReplyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("@/lib/billing", () => ({
  canCreateProjectForOrganization: canCreateProjectForOrganizationMock,
  readOrganizationBilling: readOrganizationBillingMock,
  canUseCustomDomains: canUseCustomDomainsMock,
  recordAssistantMessageUsage: recordAssistantMessageUsageMock,
}));

vi.mock("@/lib/assistant-llm", () => ({
  streamAssistantReply: streamAssistantReplyMock,
}));

vi.mock("node:dns", () => ({
  promises: {
    resolveCname: vi.fn(),
  },
}));

function selectLimitResult(value: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(value),
  };
}

describe("plan limit route enforcement", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
  });

  it("blocks project creation when the organization is at its plan limit", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    selectMock.mockReturnValueOnce(
      selectLimitResult([{ orgId: "org-1", orgSlug: "acme", role: "admin" }]),
    );
    canCreateProjectForOrganizationMock.mockResolvedValue({
      allowed: false,
      projectsUsed: 1,
      projectLimit: 1,
      plan: "free",
    });

    const { POST } = await import("@/app/api/projects/route");
    const response = await POST(
      new Request("http://localhost/api/projects", {
        method: "POST",
        body: JSON.stringify({ name: "Second Docs" }),
      }),
    );

    expect(canCreateProjectForOrganizationMock).toHaveBeenCalledWith("org-1");
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "project_limit_reached",
      projectsUsed: 1,
      projectLimit: 1,
    });
  });

  it("blocks custom domain verification for organizations without paid access", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    selectMock
      .mockReturnValueOnce(selectLimitResult([{ orgId: "org-1" }]))
      .mockReturnValueOnce(
        selectLimitResult([
          {
            id: "project-1",
            orgId: "org-1",
            slug: "docs",
            subdomain: "docs",
            customDomain: "docs.example.com",
            settings: {},
          },
        ]),
      );
    readOrganizationBillingMock.mockResolvedValue({ plan: "free" });
    canUseCustomDomainsMock.mockReturnValue(false);

    const { POST } = await import(
      "@/app/api/projects/[id]/domain/verify/route"
    );
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/domain/verify", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(readOrganizationBillingMock).toHaveBeenCalledWith("org-1");
    expect(canUseCustomDomainsMock).toHaveBeenCalledWith({ plan: "free" });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Custom domains are available on Growth and above.",
      code: "custom_domain_plan_required",
    });
  });

  it("blocks public assistant chat before LLM streaming when assistant is not included", async () => {
    selectMock.mockReturnValueOnce(
      selectLimitResult([
        {
          id: "project-1",
          name: "Docs",
          settings: {},
        },
      ]),
    );
    recordAssistantMessageUsageMock.mockResolvedValue({
      allowed: false,
      status: "assistant_not_included",
      messagesUsed: 0,
      messageLimit: 0,
    });

    const { POST } = await import("@/app/api/docs/[subdomain]/chat/route");
    const request = new Request("http://localhost/api/docs/docs/chat", {
      method: "POST",
      body: JSON.stringify({
        fp: "visitor-1",
        messages: [{ role: "user", content: "Can I ask a question?" }],
      }),
    }) as Request & { cookies: { get: ReturnType<typeof vi.fn> } };
    request.cookies = { get: vi.fn() };

    const response = await POST(request as never, {
      params: Promise.resolve({ subdomain: "docs" }),
    });

    expect(recordAssistantMessageUsageMock).toHaveBeenCalledWith("project-1");
    expect(streamAssistantReplyMock).not.toHaveBeenCalled();
    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toMatchObject({
      code: "assistant_plan_required",
      messageLimit: 0,
    });
  });
});
