import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryResults, selectMock } = vi.hoisted(() => ({
  queryResults: [] as unknown[][],
  selectMock: vi.fn(),
}));

vi.mock("@/lib/app-url", () => ({
  getPublicAppUrl: () => "https://docs.example.com",
}));

vi.mock("@/lib/db", () => ({
  db: { select: selectMock },
}));

import { GET as getLegacySitemap } from "@/app/api/docs/[subdomain]/sitemap/route";
import robots from "@/app/robots";

function queryResult(rows: unknown[], direct: boolean) {
  const result = Promise.resolve(rows);
  return direct ? result : { where: () => ({ limit: () => result }) };
}

describe("root robots publication", () => {
  beforeEach(() => {
    queryResults.length = 0;
    selectMock.mockReset();
    selectMock.mockImplementation((selection: Record<string, unknown>) => ({
      from: () =>
        queryResult(
          queryResults.shift() ?? [],
          Object.hasOwn(selection, "subdomain"),
        ),
    }));
  });

  it("advertises only explicitly indexable public projects", async () => {
    queryResults.push([
      {
        subdomain: "public-docs",
        settings: { docsConfig: { seo: { noindex: false } } },
      },
      { subdomain: "qa-project", settings: {} },
      {
        subdomain: "hidden-docs",
        settings: { docsConfig: { seo: { noindex: true } } },
      },
      {
        subdomain: "protected-docs",
        settings: {
          docsConfig: { seo: { noindex: false } },
          authentication: { mode: "password", password: "secret" },
        },
      },
    ]);

    const result = await robots();

    expect(result.sitemap).toEqual([
      "https://docs.example.com/docs/public-docs/sitemap.xml",
    ]);
  });

  it("redirects the legacy sitemap only for indexable public projects", async () => {
    queryResults.push([
      { settings: { docsConfig: { seo: { noindex: false } } } },
    ]);

    const response = await getLegacySitemap(
      new Request("https://unused.test"),
      {
        params: Promise.resolve({ subdomain: "public-docs" }),
      },
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://docs.example.com/docs/public-docs/sitemap.xml",
    );
  });

  it.each([
    ["unconfigured", {}],
    ["noindex", { docsConfig: { seo: { noindex: true } } }],
    [
      "password protected",
      {
        docsConfig: { seo: { noindex: false } },
        authentication: { mode: "password", password: "secret" },
      },
    ],
  ])("does not expose %s projects through the legacy sitemap", async (_label, settings) => {
    queryResults.push([{ settings }]);

    const response = await getLegacySitemap(
      new Request("https://unused.test"),
      {
        params: Promise.resolve({ subdomain: "private-docs" }),
      },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
