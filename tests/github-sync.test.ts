import { beforeEach, describe, expect, it, vi } from "vitest";

const dbSelectMock = vi.fn();
const transactionMock = vi.fn();
const txUpdateMock = vi.fn();
const resolveGitHubImportAccessMock = vi.fn();
const importGitHubDocsMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: dbSelectMock,
    transaction: transactionMock,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  pages: {
    id: "pages.id",
    projectId: "pages.projectId",
    path: "pages.path",
    title: "pages.title",
    content: "pages.content",
    isPublished: "pages.isPublished",
    updatedAt: "pages.updatedAt",
  },
  projects: {
    id: "projects.id",
    orgId: "projects.orgId",
    repoBranch: "projects.repoBranch",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args) => ({ op: "and", args })),
  eq: vi.fn((...args) => ({ op: "eq", args })),
  inArray: vi.fn((...args) => ({ op: "inArray", args })),
}));

vi.mock("@/lib/github-import", () => ({
  resolveGitHubImportAccess: resolveGitHubImportAccessMock,
}));

vi.mock("@/lib/github-docs-import", () => ({
  importGitHubDocs: importGitHubDocsMock,
}));

vi.mock("@/lib/github-installation-auth", () => ({
  buildGitHubInstallationAuthHeaders: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  createRequestId: () => "request-1",
  logger: { error: vi.fn(), info: vi.fn() },
}));

function mockProjectSelect(project: Record<string, unknown>) {
  dbSelectMock.mockReturnValueOnce({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([project]),
  });
}

function mockEmptyPageTransaction() {
  transactionMock.mockImplementationOnce(async (callback) => {
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      })),
      insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
      update: txUpdateMock,
      delete: vi.fn(),
    };

    await callback(tx);
  });
}

describe("syncProjectDocsFromGitHub", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    txUpdateMock.mockReturnValue({
      set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
    });
    resolveGitHubImportAccessMock.mockResolvedValue({ status: "public" });
    importGitHubDocsMock.mockResolvedValue({
      ok: true,
      pages: [
        {
          path: "introduction",
          title: "Introduction",
          content: "# Introduction",
        },
      ],
      source: {
        owner: "acme",
        repo: "docs",
        branch: "main",
        path: "/",
      },
    });
  });

  it("lets the importer resolve the default branch when the project has no stored branch", async () => {
    mockProjectSelect({
      id: "project-1",
      orgId: "org-1",
      repoUrl: "https://github.com/BoundaryML/baml",
      repoBranch: null,
      repoPath: null,
      settings: {},
    });
    mockEmptyPageTransaction();

    const { syncProjectDocsFromGitHub } = await import("@/lib/github-sync");
    const result = await syncProjectDocsFromGitHub({
      projectId: "project-1",
      orgId: "org-1",
    });

    expect(result.ok).toBe(true);
    expect(importGitHubDocsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        repoUrl: "https://github.com/BoundaryML/baml",
        repoBranch: undefined,
      }),
    );
  });

  it("persists the resolved default branch after recovering from a stale stored branch", async () => {
    mockProjectSelect({
      id: "project-1",
      orgId: "org-1",
      repoUrl: "https://github.com/BoundaryML/baml",
      repoBranch: "main",
      repoPath: null,
      settings: {},
    });
    importGitHubDocsMock.mockResolvedValueOnce({
      ok: true,
      pages: [
        {
          path: "introduction",
          title: "BAML Documentation",
          content: "# BAML Documentation",
        },
      ],
      source: {
        owner: "BoundaryML",
        repo: "baml",
        branch: "canary",
        path: "/",
      },
    });
    mockEmptyPageTransaction();

    const { syncProjectDocsFromGitHub } = await import("@/lib/github-sync");
    const result = await syncProjectDocsFromGitHub({
      projectId: "project-1",
      orgId: "org-1",
    });

    expect(result.ok).toBe(true);
    expect(txUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ repoBranch: "projects.repoBranch" }),
    );
    const projectUpdate = txUpdateMock.mock.results[0].value;
    expect(projectUpdate.set).toHaveBeenCalledWith({ repoBranch: "canary" });
  });

  it("uses an explicit branch override for preview syncs", async () => {
    mockProjectSelect({
      id: "project-1",
      orgId: "org-1",
      repoUrl: "https://github.com/acme/docs",
      repoBranch: null,
      repoPath: null,
      settings: {},
    });
    mockEmptyPageTransaction();

    const { syncProjectDocsFromGitHub } = await import("@/lib/github-sync");
    await syncProjectDocsFromGitHub({
      projectId: "project-1",
      orgId: "org-1",
      branchOverride: "preview-branch",
    });

    expect(importGitHubDocsMock).toHaveBeenCalledWith(
      expect.objectContaining({ repoBranch: "preview-branch" }),
    );
  });
});
