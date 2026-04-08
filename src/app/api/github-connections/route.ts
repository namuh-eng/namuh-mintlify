import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  githubConnections,
  orgMemberships,
  organizations,
} from "@/lib/db/schema";
import { validateCreateConnectionRequest } from "@/lib/github-webhook";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** Resolve user's org and role. */
async function resolveUserOrg(userId: string) {
  const rows = await db
    .select({
      orgId: orgMemberships.orgId,
      role: orgMemberships.role,
      orgName: organizations.name,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

/** GET /api/github-connections — list GitHub connections for user's org */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await resolveUserOrg(session.user.id);
  if (!org) {
    return NextResponse.json({ connections: [] });
  }

  const connections = await db
    .select()
    .from(githubConnections)
    .where(eq(githubConnections.orgId, org.orgId));

  return NextResponse.json({ connections });
}

/** POST /api/github-connections — create a new GitHub connection */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await resolveUserOrg(session.user.id);
  if (!org) {
    return NextResponse.json(
      { error: "No organization found" },
      { status: 403 },
    );
  }

  if (org.role !== "admin" && org.role !== "editor") {
    return NextResponse.json(
      { error: "Only admins and editors can manage GitHub connections" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const validation = validateCreateConnectionRequest(body);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const installationId = validation.installationId ?? "";
  const repos = validation.repos ?? [];
  const autoUpdateEnabled = validation.autoUpdateEnabled ?? true;

  // Check for existing connection with same installation ID
  const existing = await db
    .select()
    .from(githubConnections)
    .where(eq(githubConnections.installationId, installationId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing connection
    const [updated] = await db
      .update(githubConnections)
      .set({
        repos,
        autoUpdateEnabled,
      })
      .where(eq(githubConnections.id, existing[0].id))
      .returning();

    return NextResponse.json({ connection: updated });
  }

  const [connection] = await db
    .insert(githubConnections)
    .values({
      orgId: org.orgId,
      installationId,
      repos,
      autoUpdateEnabled,
    })
    .returning();

  return NextResponse.json({ connection }, { status: 201 });
}

/** DELETE /api/github-connections — remove a GitHub connection */
export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await resolveUserOrg(session.user.id);
  if (!org) {
    return NextResponse.json(
      { error: "No organization found" },
      { status: 403 },
    );
  }

  if (org.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can remove GitHub connections" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("id");

  if (!connectionId) {
    return NextResponse.json(
      { error: "Connection ID is required" },
      { status: 400 },
    );
  }

  await db
    .delete(githubConnections)
    .where(
      and(
        eq(githubConnections.id, connectionId),
        eq(githubConnections.orgId, org.orgId),
      ),
    );

  return NextResponse.json({ success: true });
}
