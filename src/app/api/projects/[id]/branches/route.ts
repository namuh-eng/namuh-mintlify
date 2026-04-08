import { auth } from "@/lib/auth";
import { validateBranchName } from "@/lib/collaboration";
import { db } from "@/lib/db";
import { branches, orgMemberships, projects } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

async function resolveProjectAccess(
  userId: string,
  projectId: string,
): Promise<{ ok: true; role: string } | { ok: false; response: NextResponse }> {
  const project = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (project.length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      ),
    };
  }

  const membership = await db
    .select({ role: orgMemberships.role })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.userId, userId),
        eq(orgMemberships.orgId, project[0].orgId),
      ),
    )
    .limit(1);

  if (membership.length === 0) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, role: membership[0].role };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const access = await resolveProjectAccess(session.user.id, projectId);
  if (!access.ok) return access.response;

  const rows = await db
    .select()
    .from(branches)
    .where(eq(branches.projectId, projectId))
    .orderBy(asc(branches.name));

  // If no branches exist, return a virtual "main" default
  if (rows.length === 0) {
    return NextResponse.json({
      branches: [
        {
          id: "default",
          projectId,
          name: "main",
          isDefault: true,
          createdBy: null,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  }

  return NextResponse.json({ branches: rows });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const access = await resolveProjectAccess(session.user.id, projectId);
  if (!access.ok) return access.response;

  if (access.role !== "admin" && access.role !== "editor") {
    return NextResponse.json(
      { error: "Only editors and admins can create branches" },
      { status: 403 },
    );
  }

  const body = await req.json();
  const error = validateBranchName(body.name);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  // Ensure default branch exists
  const existing = await db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.projectId, projectId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(branches).values({
      projectId,
      name: "main",
      isDefault: true,
      createdBy: session.user.id,
    });
  }

  const [created] = await db
    .insert(branches)
    .values({
      projectId,
      name: body.name,
      isDefault: false,
      createdBy: session.user.id,
    })
    .returning();

  return NextResponse.json({ branch: created }, { status: 201 });
}
