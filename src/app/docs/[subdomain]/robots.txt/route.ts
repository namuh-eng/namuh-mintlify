import { eq } from "drizzle-orm";
import { getPublicAppUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { isProjectPasswordProtected } from "@/lib/project-publication-auth";
import { isPublicDocsProjectIndexable } from "@/lib/public-docs-curation";
import { generateRobotsTxt } from "@/lib/seo";

const APP_URL = getPublicAppUrl();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subdomain: string }> },
) {
  const { subdomain } = await params;

  const projectResult = await db
    .select({ id: projects.id, settings: projects.settings })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (projectResult.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  const settings = projectResult[0].settings;
  const passwordProtected = isProjectPasswordProtected(settings);
  const indexable =
    !passwordProtected && isPublicDocsProjectIndexable(settings);
  const txt = generateRobotsTxt(APP_URL, subdomain, indexable);

  return new Response(txt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": passwordProtected
        ? "private, no-store"
        : indexable
          ? "public, max-age=3600, s-maxage=3600"
          : "public, max-age=300, s-maxage=300",
    },
  });
}
