import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DocsLandingContent } from "@/app/docs/page";
import type { DocsEntryProject } from "@/lib/docs-entry";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

function renderDocsLanding(publishedProjects: DocsEntryProject[]) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(<DocsLandingContent publishedProjects={publishedProjects} />);
  });
  return container;
}

describe("docs landing navigation targets", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
      root = null;
    });
  });

  it("marks the primary CTA as a testable link to the first public docs entry", () => {
    const container = renderDocsLanding([
      {
        id: "project-1",
        name: "Acme Docs",
        subdomain: "acme",
        href: "/docs/acme/introduction",
        pageTitle: "Introduction",
        pageDescription: "Start here",
      },
    ]);

    const primaryLink = container.querySelector<HTMLAnchorElement>(
      '[data-testid="docs-primary-entry-link"]',
    );

    expect(primaryLink?.getAttribute("href")).toBe("/docs/acme/introduction");
    expect(primaryLink?.dataset.docsEntryHref).toBe("/docs/acme/introduction");
    expect(primaryLink?.getAttribute("aria-label")).toBe(
      "Explore first published docs: Acme Docs",
    );
  });

  it("marks published docs cards as stable navigation targets", () => {
    const container = renderDocsLanding([
      {
        id: "project-1",
        name: "Acme Docs",
        subdomain: "acme",
        href: "/docs/acme/introduction",
        pageTitle: "Introduction",
        pageDescription: null,
      },
    ]);

    const cardLink = container.querySelector<HTMLAnchorElement>(
      '[data-testid="docs-entry-card-link"][data-docs-entry-id="project-1"]',
    );

    expect(cardLink?.getAttribute("href")).toBe("/docs/acme/introduction");
    expect(cardLink?.dataset.docsEntryHref).toBe("/docs/acme/introduction");
    expect(cardLink?.getAttribute("aria-label")).toBe(
      "Open Acme Docs at /docs/acme/introduction",
    );
    expect(cardLink?.textContent).toContain("/docs/acme/introduction");
  });
});
