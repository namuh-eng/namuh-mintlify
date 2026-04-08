import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, projects } from "@/lib/db/schema";
import { validateUpdateProjectRequest } from "@/lib/projects";
import { and, eq, ne, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

async function getUserOrgId(userId: string): Promise<string | null> {
  const membership = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId))
    .limit(1);
  return membership.length > 0 ? membership[0].orgId : null;
}

async function getUserOrgRole(
  userId: string,
): Promise<{ orgId: string; role: string } | null> {
  const membership = await db
    .select({ orgId: orgMemberships.orgId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId))
    .limit(1);
  return membership.length > 0 ? membership[0] : null;
}

/** GET /api/projects/[id] — get a single project */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = await getUserOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const result = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.orgId, orgId)))
    .limit(1);

  if (result.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project: result[0] });
}

/** PUT /api/projects/[id] — update a project */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await getUserOrgRole(session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  if (membership.role !== "admin" && membership.role !== "editor") {
    return NextResponse.json(
      { error: "Only admins and editors can update projects" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const validation = validateUpdateProjectRequest(body);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Verify project belongs to user's org
  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.orgId, membership.orgId)))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(projects)
    .set({ ...validation.fields, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  return NextResponse.json({ project: updated });
}

/** DELETE /api/projects/[id] — delete a project (cannot delete last) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await getUserOrgRole(session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  if (membership.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can delete projects" },
      { status: 403 },
    );
  }

  // Check project exists and belongs to org
  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.orgId, membership.orgId)))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Cannot delete the org's last project
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.orgId, membership.orgId));

  if (countResult[0].count <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the organization's last project" },
      { status: 400 },
    );
  }

  await db.delete(projects).where(eq(projects.id, id));

  return NextResponse.json({ success: true });
}
