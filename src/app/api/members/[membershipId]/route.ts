import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships } from "@/lib/db/schema";
import { canManageRole } from "@/lib/members";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

async function getUserOrg() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [membership] = await db
    .select({ orgId: orgMemberships.orgId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (!membership) return null;
  return {
    userId: session.user.id,
    orgId: membership.orgId,
    role: membership.role,
  };
}

/** DELETE /api/members/[membershipId] — remove a member from the org */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  const ctx = await getUserOrg();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageRole(ctx.role, "viewer")) {
    return NextResponse.json(
      { error: "Forbidden — admin role required" },
      { status: 403 },
    );
  }

  const { membershipId } = await params;

  // Verify membership belongs to this org
  const [membership] = await db
    .select({ id: orgMemberships.id, userId: orgMemberships.userId })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.id, membershipId),
        eq(orgMemberships.orgId, ctx.orgId),
      ),
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Cannot remove yourself
  if (membership.userId === ctx.userId) {
    return NextResponse.json(
      { error: "Cannot remove yourself from the organization" },
      { status: 400 },
    );
  }

  await db.delete(orgMemberships).where(eq(orgMemberships.id, membershipId));

  return NextResponse.json({ success: true });
}
