import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryResults, selectMock } = vi.hoisted(() => ({
  queryResults: [] as unknown[][],
  selectMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { select: selectMock },
}));

import {
  buildPublicDocsBaseUrl,
  getPublicDocsLlmsResponse,
} from "@/lib/public-docs-llms";

describe("buildPublicDocsBaseUrl", () => {
  it("builds the docs-site base URL from the request origin", () => {
    expect(buildPublicDocsBaseUrl("https://app.example.com", "acme")).toBe(
      "https://app.example.com/docs/acme",
    );
  });

  it("normalizes trailing slashes on the origin", () => {
    expect(buildPublicDocsBaseUrl("https://example.com/", "docs")).toBe(
      "https://example.com/docs/docs",
    );
  });
});

describe("getPublicDocsLlmsResponse publication controls", () => {
  beforeEach(() => {
    queryResults.length = 0;
    selectMock.mockReset();
    selectMock.mockImplementation((selection: Record<string, unknown>) => ({
      from: () => {
        const rows = queryResults.shift() ?? [];
        if (Object.hasOwn(selection, "content")) {
          return { where: () => ({ orderBy: () => Promise.resolve(rows) }) };
        }
        return { where: () => ({ limit: () => Promise.resolve(rows) }) };
      },
    }));
  });

  const request = new Request("https://docs.example.com/docs/acme/llms.txt");

  it("withholds content for password-protected docs and refuses caching", async () => {
    queryResults.push([
      {
        id: "project-id",
        name: "Acme",
        settings: {
          indexingEnabled: true,
          authentication: { mode: "password", password: "secret" },
        },
      },
    ]);

    const response = await getPublicDocsLlmsResponse(request, "acme", "full");

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(await response.text()).not.toContain("Acme");
    // Page content is never queried for protected projects.
    expect(selectMock).toHaveBeenCalledOnce();
  });

  it("marks unindexed public docs noindex with a short TTL", async () => {
    queryResults.push([{ id: "project-id", name: "Acme", settings: {} }]);
    queryResults.push([
      { path: "intro", title: "Intro", content: "# Intro", frontmatter: {} },
    ]);

    const response = await getPublicDocsLlmsResponse(request, "acme", "index");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=300, s-maxage=300",
    );
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(await response.text()).toContain("Intro");
  });

  it("serves indexable docs with the long edge TTL and no noindex header", async () => {
    queryResults.push([
      { id: "project-id", name: "Acme", settings: { indexingEnabled: true } },
    ]);
    queryResults.push([
      { path: "intro", title: "Intro", content: "# Intro", frontmatter: {} },
    ]);

    const response = await getPublicDocsLlmsResponse(request, "acme", "index");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=3600, s-maxage=3600",
    );
    expect(response.headers.get("x-robots-tag")).toBeNull();
  });

  it("does not cache unknown-project responses", async () => {
    queryResults.push([]);

    const response = await getPublicDocsLlmsResponse(
      request,
      "missing",
      "full",
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
