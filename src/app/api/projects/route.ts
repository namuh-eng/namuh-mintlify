import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, organizations, projects } from "@/lib/db/schema";
import {
  generateSubdomain,
  slugifyProject,
  validateCreateProjectRequest,
} from "@/lib/projects";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** GET /api/projects — list projects for the user's org */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve the user's org
  const membership = await db
    .select({
      orgId: orgMemberships.orgId,
      orgSlug: organizations.slug,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (membership.length === 0) {
    return NextResponse.json({ projects: [] });
  }

  const orgId = membership[0].orgId;

  const orgProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      repoUrl: projects.repoUrl,
      repoBranch: projects.repoBranch,
      customDomain: projects.customDomain,
      subdomain: projects.subdomain,
      status: projects.status,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.orgId, orgId))
    .orderBy(projects.createdAt);

  return NextResponse.json({ projects: orgProjects });
}

/** POST /api/projects — create a new project in the user's org */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve org + check admin role
  const membership = await db
    .select({
      orgId: orgMemberships.orgId,
      role: orgMemberships.role,
      orgSlug: organizations.slug,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (membership.length === 0) {
    return NextResponse.json(
      { error: "You must belong to an organization" },
      { status: 403 },
    );
  }

  const { orgId, orgSlug, role } = membership[0];

  if (role !== "admin" && role !== "editor") {
    return NextResponse.json(
      { error: "Only admins and editors can create projects" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const validation = validateCreateProjectRequest(body);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const slug = slugifyProject(validation.name);
  if (!slug) {
    return NextResponse.json(
      { error: "Could not generate a valid slug from project name" },
      { status: 400 },
    );
  }

  // Check slug uniqueness within org
  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.orgId, orgId), eq(projects.slug, slug)))
    .limit(1);

  const finalSlug =
    existing.length > 0 ? `${slug}-${Date.now().toString(36)}` : slug;

  const subdomain = generateSubdomain(orgSlug, finalSlug);

  const [project] = await db
    .insert(projects)
    .values({
      orgId,
      name: validation.name,
      slug: finalSlug,
      subdomain,
      repoUrl: validation.repoUrl ?? null,
    })
    .returning();

  return NextResponse.json({ project }, { status: 201 });
}
