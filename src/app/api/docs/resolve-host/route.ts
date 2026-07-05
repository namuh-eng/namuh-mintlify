import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import {
  normalizeHostHeader,
  resolveManagedDocsSubdomain,
} from "@/lib/domains";

function hasVerifiedDomain(
  settings: Record<string, unknown> | null | undefined,
) {
  return typeof settings?.domainVerifiedAt === "string";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hostname = normalizeHostHeader(searchParams.get("host"));

  if (!hostname) {
    return NextResponse.json({ error: "Missing host" }, { status: 400 });
  }

  const managedSubdomain = resolveManagedDocsSubdomain(hostname);
  if (managedSubdomain) {
    return NextResponse.json({
      subdomain: managedSubdomain,
      source: "managed",
    });
  }

  const [project] = await db
    .select({
      subdomain: projects.subdomain,
      slug: projects.slug,
      settings: projects.settings,
    })
    .from(projects)
    .where(eq(sql`lower(${projects.customDomain})`, hostname))
    .limit(1)
    .catch(() => []);

  if (!project || !hasVerifiedDomain(project.settings)) {
    return NextResponse.json({ error: "Host not found" }, { status: 404 });
  }

  return NextResponse.json({
    subdomain: project.subdomain ?? project.slug,
    source: "custom-domain",
  });
}
