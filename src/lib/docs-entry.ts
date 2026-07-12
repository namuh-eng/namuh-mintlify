import { isPublicDocsVisiblePage } from "@/lib/public-docs-curation";

export interface DocsEntryRow {
  projectId: string;
  projectName: string;
  subdomain: string | null;
  pagePath: string;
  pageTitle: string;
  pageDescription: string | null;
  pageFrontmatter?: Record<string, unknown> | null;
}

export interface DocsEntryProject {
  id: string;
  name: string;
  subdomain: string;
  href: string;
  pageTitle: string;
  pageDescription: string | null;
}

type SelectedDocsEntryProject = DocsEntryProject & {
  selectedPriority: number;
};

function trimRouteSlashes(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "");
}

function normalizeDocsEntryPath(subdomain: string, pagePath: string): string {
  const cleanSubdomain = trimRouteSlashes(subdomain);
  const cleanPath = pagePath
    .trim()
    .replace(/\\/g, "/")
    .replace(/\.(md|mdx)$/i, "");
  const segments = trimRouteSlashes(cleanPath).split("/").filter(Boolean);

  if (segments[0] === "docs" && segments[1] === cleanSubdomain) {
    segments.splice(0, 2);
  }

  return segments.join("/");
}

function pagePriority(path: string): number {
  switch (path) {
    case "introduction":
      return 0;
    case "getting-started":
      return 1;
    case "quickstart":
      return 2;
    default:
      return 3;
  }
}

export function buildDocsEntryHref(
  subdomain: string,
  pagePath: string,
): string {
  const cleanSubdomain = trimRouteSlashes(subdomain);
  const cleanPagePath = normalizeDocsEntryPath(cleanSubdomain, pagePath);

  return cleanPagePath
    ? `/docs/${cleanSubdomain}/${cleanPagePath}`
    : `/docs/${cleanSubdomain}`;
}

export function getPrimaryDocsEntryHref(
  projects: Pick<DocsEntryProject, "href">[],
): string {
  return projects[0]?.href ?? "/onboarding";
}

export function buildDocsEntryProjects(
  rows: DocsEntryRow[],
): DocsEntryProject[] {
  const projects = new Map<string, SelectedDocsEntryProject>();

  for (const row of rows) {
    if (!row.subdomain || !row.pagePath) continue;
    const cleanPagePath = normalizeDocsEntryPath(row.subdomain, row.pagePath);
    if (
      !isPublicDocsVisiblePage({
        path: cleanPagePath,
        title: row.pageTitle,
        frontmatter: row.pageFrontmatter,
      })
    ) {
      continue;
    }

    const candidate = {
      id: row.projectId,
      name: row.projectName,
      subdomain: row.subdomain,
      href: buildDocsEntryHref(row.subdomain, cleanPagePath),
      pageTitle: row.pageTitle,
      pageDescription: row.pageDescription,
      selectedPriority: pagePriority(cleanPagePath),
    };

    const existing = projects.get(row.projectId);
    if (!existing || candidate.selectedPriority < existing.selectedPriority) {
      projects.set(row.projectId, candidate);
    }
  }

  return Array.from(projects.values()).map(
    ({ selectedPriority: _selectedPriority, ...project }) => project,
  );
}
