import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

interface DocsIndexProps {
  params: Promise<{ subdomain: string }>;
}

/** Docs site index: redirects to the first published page or shows a 404 */
export default async function DocsIndex({ params }: DocsIndexProps) {
  const { subdomain } = await params;

  const projectResult = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (projectResult.length === 0) {
    notFound();
  }

  // Find first published page
  const firstPage = await db
    .select({ path: pages.path })
    .from(pages)
    .where(
      and(
        eq(pages.projectId, projectResult[0].id),
        eq(pages.isPublished, true),
      ),
    )
    .orderBy(pages.path)
    .limit(1);

  if (firstPage.length > 0) {
    redirect(`/docs/${subdomain}/${firstPage[0].path}`);
  }

  notFound();
}
