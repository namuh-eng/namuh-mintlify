import { describe, expect, it } from "vitest";
import {
  buildDocsEntryHref,
  buildDocsEntryProjects,
  getPrimaryDocsEntryHref,
} from "@/lib/docs-entry";

describe("buildDocsEntryProjects", () => {
  it("selects introduction as the preferred public entry point", () => {
    expect(
      buildDocsEntryProjects([
        {
          projectId: "project-1",
          projectName: "Test Project",
          subdomain: "test-project",
          pagePath: "quickstart",
          pageTitle: "Quickstart",
          pageDescription: null,
        },
        {
          projectId: "project-1",
          projectName: "Test Project",
          subdomain: "test-project",
          pagePath: "introduction",
          pageTitle: "Introduction",
          pageDescription: "Start here",
        },
      ]),
    ).toEqual([
      {
        id: "project-1",
        name: "Test Project",
        subdomain: "test-project",
        href: "/docs/test-project/introduction",
        pageTitle: "Introduction",
        pageDescription: "Start here",
      },
    ]);
  });

  it("omits projects without a public docs subdomain", () => {
    expect(
      buildDocsEntryProjects([
        {
          projectId: "project-1",
          projectName: "Private Project",
          subdomain: null,
          pagePath: "introduction",
          pageTitle: "Introduction",
          pageDescription: null,
        },
      ]),
    ).toEqual([]);
  });

  it("skips internal generated docs when selecting public entry cards", () => {
    expect(
      buildDocsEntryProjects([
        {
          projectId: "project-1",
          projectName: "Test Project",
          subdomain: "test-project",
          pagePath: "ralph/build-loop-prompt",
          pageTitle: "Build Loop Prompt",
          pageDescription: null,
        },
        {
          projectId: "project-1",
          projectName: "Test Project",
          subdomain: "test-project",
          pagePath: "quickstart",
          pageTitle: "Quickstart",
          pageDescription: "Start here",
        },
      ]),
    ).toEqual([
      {
        id: "project-1",
        name: "Test Project",
        subdomain: "test-project",
        href: "/docs/test-project/quickstart",
        pageTitle: "Quickstart",
        pageDescription: "Start here",
      },
    ]);
  });

  it("normalizes only full docs route prefixes to direct docs page routes", () => {
    expect(buildDocsEntryHref("acme", "/introduction/")).toBe(
      "/docs/acme/introduction",
    );
    expect(buildDocsEntryHref("/acme/", "/docs/acme/quickstart")).toBe(
      "/docs/acme/quickstart",
    );
    expect(buildDocsEntryHref("acme", "docs/reference")).toBe(
      "/docs/acme/docs/reference",
    );
    expect(buildDocsEntryHref("acme", "/docs/acme/reference")).toBe(
      "/docs/acme/reference",
    );
    expect(buildDocsEntryHref("acme", "acme/reference")).toBe(
      "/docs/acme/acme/reference",
    );
  });

  it("removes markdown extensions without stripping valid docs page paths", () => {
    expect(buildDocsEntryHref("acme", "docs/reference.mdx")).toBe(
      "/docs/acme/docs/reference",
    );
    expect(buildDocsEntryHref("acme", "/docs/acme/reference.md")).toBe(
      "/docs/acme/reference",
    );
  });

  it("uses normalized paths when choosing the first public entry", () => {
    expect(
      buildDocsEntryProjects([
        {
          projectId: "project-1",
          projectName: "Test Project",
          subdomain: "test-project",
          pagePath: "quickstart",
          pageTitle: "Quickstart",
          pageDescription: null,
        },
        {
          projectId: "project-1",
          projectName: "Test Project",
          subdomain: "test-project",
          pagePath: "/docs/test-project/introduction/",
          pageTitle: "Introduction",
          pageDescription: "Start here",
        },
      ]),
    ).toEqual([
      {
        id: "project-1",
        name: "Test Project",
        subdomain: "test-project",
        href: "/docs/test-project/introduction",
        pageTitle: "Introduction",
        pageDescription: "Start here",
      },
    ]);
  });

  it("returns the first docs entry href for primary landing navigation", () => {
    expect(
      getPrimaryDocsEntryHref([
        {
          href: "/docs/acme/introduction",
        },
      ]),
    ).toBe("/docs/acme/introduction");
    expect(getPrimaryDocsEntryHref([])).toBe("/onboarding");
  });
});
