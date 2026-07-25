import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { isProjectPasswordProtected } from "@/lib/project-publication-auth";
import { isPublicDocsProjectIndexable } from "@/lib/public-docs-curation";

export const dynamic = "force-dynamic";

const APP_URL = getPublicAppUrl();

/**
 * GET /robots.txt
 *
 * Dynamically advertises only documentation sites explicitly enabled for indexing.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const allProjects = await db
    .select({ subdomain: projects.subdomain, settings: projects.settings })
    .from(projects);

  const indexedSubdomains = allProjects.flatMap((project) =>
    typeof project.subdomain === "string" &&
    project.subdomain.length > 0 &&
    isPublicDocsProjectIndexable(project.settings) &&
    !isProjectPasswordProtected(project.settings)
      ? [project.subdomain]
      : [],
  );
  const sitemaps = indexedSubdomains.map(
    (subdomain) =>
      `${APP_URL}/docs/${encodeURIComponent(subdomain)}/sitemap.xml`,
  );

  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        ...indexedSubdomains.map(
          (subdomain) => `/docs/${encodeURIComponent(subdomain)}/`,
        ),
      ],
      disallow: ["/docs/", "/api/docs/"],
    },
    sitemap: sitemaps,
  };
}
