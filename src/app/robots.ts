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

  const sitemaps = allProjects
    .filter(
      (project) =>
        isPublicDocsProjectIndexable(project.settings) &&
        !isProjectPasswordProtected(project.settings),
    )
    .map(
      (project) =>
        `${APP_URL}/docs/${encodeURIComponent(project.subdomain)}/sitemap.xml`,
    );

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: sitemaps,
  };
}
