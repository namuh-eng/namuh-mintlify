import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, organizations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 1000;

/** DELETE /api/orgs/[id] — permanently delete an organization (admin only) */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Parse body for reason
  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body is required" },
      { status: 400 },
    );
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < MIN_REASON_LENGTH) {
    return NextResponse.json(
      {
        error: `Reason must be at least ${MIN_REASON_LENGTH} characters`,
      },
      { status: 400 },
    );
  }
  if (reason.length > MAX_REASON_LENGTH) {
    return NextResponse.json(
      {
        error: `Reason must be at most ${MAX_REASON_LENGTH} characters`,
      },
      { status: 400 },
    );
  }

  // Verify user is admin of this org
  const membership = await db
    .select({ orgId: orgMemberships.orgId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.userId, session.user.id),
        eq(orgMemberships.orgId, id),
      ),
    )
    .limit(1);

  if (membership.length === 0) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  if (membership[0].role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can delete organizations" },
      { status: 403 },
    );
  }

  // Verify org exists
  const existing = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  // Delete org — cascading deletes handle memberships, projects, pages, etc.
  await db.delete(organizations).where(eq(organizations.id, id));

  return NextResponse.json({ success: true, reason });
}
