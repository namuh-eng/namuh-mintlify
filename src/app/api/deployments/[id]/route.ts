import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deployments, orgMemberships, projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/deployments/[id] — get a single deployment */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Get deployment
  const rows = await db
    .select()
    .from(deployments)
    .where(eq(deployments.id, id))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Deployment not found" },
      { status: 404 },
    );
  }

  const deployment = rows[0];

  // Verify user has access to the project's org
  const projectRows = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, deployment.projectId))
    .limit(1);

  if (projectRows.length === 0) {
    return NextResponse.json(
      { error: "Deployment not found" },
      { status: 404 },
    );
  }

  const memberRows = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.userId, session.user.id),
        eq(orgMemberships.orgId, projectRows[0].orgId),
      ),
    )
    .limit(1);

  if (memberRows.length === 0) {
    return NextResponse.json(
      { error: "Deployment not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ deployment });
}
