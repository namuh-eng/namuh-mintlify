import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/auth-schema";
import { orgMemberships } from "@/lib/db/schema";
import {
  canManageRole,
  formatMemberForResponse,
  validateInviteRequest,
} from "@/lib/members";
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

/** GET /api/members — list all members of the user's org */
export async function GET() {
  const ctx = await getUserOrg();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      membershipId: orgMemberships.id,
      userId: orgMemberships.userId,
      role: orgMemberships.role,
      joinedAt: orgMemberships.createdAt,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
    })
    .from(orgMemberships)
    .innerJoin(user, eq(orgMemberships.userId, user.id))
    .where(eq(orgMemberships.orgId, ctx.orgId))
    .orderBy(orgMemberships.createdAt);

  const members = rows.map(formatMemberForResponse);
  return NextResponse.json({ members });
}

/** POST /api/members — invite a user to the org by email */
export async function POST(request: Request) {
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

  const body = await request.json();
  const validation = validateInviteRequest(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Find user by email
  const [targetUser] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.email, validation.email))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json(
      { error: "No user found with that email. They must sign up first." },
      { status: 404 },
    );
  }

  // Check if already a member
  const [existing] = await db
    .select({ id: orgMemberships.id })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.orgId, ctx.orgId),
        eq(orgMemberships.userId, targetUser.id),
      ),
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "User is already a member of this organization" },
      { status: 409 },
    );
  }

  const [membership] = await db
    .insert(orgMemberships)
    .values({
      orgId: ctx.orgId,
      userId: targetUser.id,
      role: validation.role,
    })
    .returning();

  return NextResponse.json(
    {
      member: {
        id: membership.id,
        userId: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: membership.role,
        joinedAt: membership.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
