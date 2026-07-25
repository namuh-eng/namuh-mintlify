import { eq } from "drizzle-orm";
import { getPublicAppUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { isProjectPasswordProtected } from "@/lib/project-publication-auth";
import { isPublicDocsProjectIndexable } from "@/lib/public-docs-curation";

const APP_URL = getPublicAppUrl();

/**
 * GET /api/docs/[subdomain]/sitemap
 *
 * Delegates the retired API endpoint to the canonical sitemap route.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subdomain: string }> },
) {
  const { subdomain } = await params;

  const [project] = await db
    .select({ settings: projects.settings })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (
    !project ||
    !isPublicDocsProjectIndexable(project.settings) ||
    isProjectPasswordProtected(project.settings)
  ) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  return new Response(null, {
    status: 308,
    headers: {
      Location: `${APP_URL}/docs/${encodeURIComponent(subdomain)}/sitemap.xml`,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
