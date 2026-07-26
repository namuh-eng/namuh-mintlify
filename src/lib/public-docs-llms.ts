import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";
import { generateLlmsFullTxt, generateLlmsTxt } from "@/lib/llms-txt";
import { isProjectPasswordProtected } from "@/lib/project-publication-auth";
import {
  filterPublicDocsVisiblePages,
  isPublicDocsProjectIndexable,
} from "@/lib/public-docs-curation";

export type PublicLlmsType = "index" | "full";

/** Bounded TTL for public-but-unadvertised docs sites. */
const UNINDEXED_LLMS_TTL_SECONDS = 300;
/** Longer TTL once a project opted into indexing; keeps crawlers off the app. */
const INDEXED_LLMS_TTL_SECONDS = 3600;

export function buildPublicDocsBaseUrl(origin: string, subdomain: string) {
  return `${origin.replace(/\/+$/, "")}/docs/${subdomain}`;
}

export async function getPublicDocsLlmsResponse(
  request: Request,
  subdomain: string,
  type: PublicLlmsType,
) {
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      settings: projects.settings,
    })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (!project) {
    return new NextResponse("Project not found", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  // Password-protected docs must never expose page content or titles through an
  // unauthenticated artifact, and must never become an edge cache entry.
  if (isProjectPasswordProtected(project.settings)) {
    return new NextResponse("Not found", {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  }

  const publishedPages = await db
    .select({
      path: pages.path,
      title: pages.title,
      content: pages.content,
      frontmatter: pages.frontmatter,
    })
    .from(pages)
    .where(and(eq(pages.projectId, project.id), eq(pages.isPublished, true)))
    .orderBy(pages.path);

  const visiblePages = filterPublicDocsVisiblePages(publishedPages);

  const baseUrl = buildPublicDocsBaseUrl(
    new URL(request.url).origin,
    subdomain,
  );
  const content =
    type === "full"
      ? generateLlmsFullTxt(project.name, baseUrl, visiblePages)
      : generateLlmsTxt(project.name, baseUrl, visiblePages);

  const indexable = isPublicDocsProjectIndexable(project.settings);
  const ttl = indexable ? INDEXED_LLMS_TTL_SECONDS : UNINDEXED_LLMS_TTL_SECONDS;
  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": `public, max-age=${ttl}, s-maxage=${ttl}`,
  };
  if (!indexable) {
    headers["X-Robots-Tag"] = "noindex";
  }

  return new NextResponse(content, { status: 200, headers });
}
