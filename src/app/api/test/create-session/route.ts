import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  session as authSessions,
  user as authUsers,
} from "@/lib/db/auth-schema";
import { orgMemberships, organizations, projects } from "@/lib/db/schema";
import { slugify } from "@/lib/orgs";
import { generateSubdomain, slugifyProject } from "@/lib/projects";
import { serializeSignedCookie } from "better-call";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// Test-only route for creating sessions in E2E tests.
// Only available in dedicated test environments.
export async function POST(request: Request) {
  const isTestEnv =
    process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT_TEST === "true";

  if (!isTestEnv) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const body = await request.json();
  const { email, name } = body as { email: string; name: string };

  if (!email || !name) {
    return NextResponse.json(
      { error: "email and name required" },
      { status: 400 },
    );
  }

  let [existingUser] = await db
    .select({
      id: authUsers.id,
      name: authUsers.name,
      email: authUsers.email,
    })
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1);

  if (!existingUser) {
    const [createdUser] = await db
      .insert(authUsers)
      .values({
        id: randomUUID(),
        name,
        email,
        emailVerified: true,
      })
      .returning({
        id: authUsers.id,
        name: authUsers.name,
        email: authUsers.email,
      });

    existingUser = createdUser;
  }

  if (!existingUser) {
    return NextResponse.json(
      { error: "failed to create user" },
      { status: 500 },
    );
  }

  let [membership] = await db
    .select({
      orgId: orgMemberships.orgId,
    })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, existingUser.id))
    .limit(1);

  if (!membership) {
    const orgSlugBase = slugify(name) || "playwright-user";
    const orgSlug = `${orgSlugBase}-${existingUser.id.slice(0, 6)}`;
    const [organization] = await db
      .insert(organizations)
      .values({
        name: `${name}'s Workspace`,
        slug: orgSlug,
      })
      .returning({
        id: organizations.id,
        slug: organizations.slug,
      });

    if (!organization) {
      return NextResponse.json(
        { error: "failed to create organization" },
        { status: 500 },
      );
    }

    await db.insert(orgMemberships).values({
      orgId: organization.id,
      userId: existingUser.id,
      role: "admin",
    });

    membership = { orgId: organization.id };
  }

  const [existingProject] = await db
    .select({
      id: projects.id,
    })
    .from(projects)
    .where(eq(projects.orgId, membership.orgId))
    .limit(1);

  if (!existingProject) {
    const projectName = "QA Project";
    const projectSlug = slugifyProject(projectName) || "qa-project";
    const [organization] = await db
      .select({
        slug: organizations.slug,
      })
      .from(organizations)
      .where(eq(organizations.id, membership.orgId))
      .limit(1);

    await db.insert(projects).values({
      orgId: membership.orgId,
      name: projectName,
      slug: projectSlug,
      subdomain: generateSubdomain(organization?.slug ?? "qa", projectSlug),
      status: "active",
    });
  }

  await db.delete(authSessions).where(eq(authSessions.userId, existingUser.id));

  const sessionToken = randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(authSessions).values({
    id: randomUUID(),
    token: sessionToken,
    userId: existingUser.id,
    expiresAt,
    userAgent: "Playwright",
  });

  const context = await auth.$context;
  const sessionCookie = context.authCookies.sessionToken;
  const setCookie = await serializeSignedCookie(
    sessionCookie.name,
    sessionToken,
    context.secret,
    {
      ...sessionCookie.attributes,
      expires: expiresAt,
      maxAge: 7 * 24 * 60 * 60,
    },
  );

  return NextResponse.json({
    success: true,
    user: existingUser,
    setCookie,
    expiresAt: expiresAt.toISOString(),
  });
}
