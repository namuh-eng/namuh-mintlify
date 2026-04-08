import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  deployments,
  orgMemberships,
  organizations,
  projects,
} from "@/lib/db/schema";
import { validateTriggerDeploymentRequest } from "@/lib/deployments";
import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** Resolve user's first org + first project. Returns null if not found. */
async function resolveUserProject(userId: string) {
  const membership = await db
    .select({
      orgId: orgMemberships.orgId,
      role: orgMemberships.role,
      orgSlug: organizations.slug,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, userId))
    .limit(1);

  if (membership.length === 0) return null;

  const orgId = membership[0].orgId;

  const orgProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      subdomain: projects.subdomain,
    })
    .from(projects)
    .where(eq(projects.orgId, orgId))
    .orderBy(projects.createdAt)
    .limit(1);

  if (orgProjects.length === 0) return null;

  return {
    orgId,
    role: membership[0].role,
    project: orgProjects[0],
  };
}

/** GET /api/deployments — list deployments for the user's active project */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveUserProject(session.user.id);
  if (!ctx) {
    return NextResponse.json({ deployments: [] });
  }

  const rows = await db
    .select({
      id: deployments.id,
      projectId: deployments.projectId,
      status: deployments.status,
      commitSha: deployments.commitSha,
      commitMessage: deployments.commitMessage,
      startedAt: deployments.startedAt,
      endedAt: deployments.endedAt,
      createdAt: deployments.createdAt,
    })
    .from(deployments)
    .where(eq(deployments.projectId, ctx.project.id))
    .orderBy(desc(deployments.createdAt))
    .limit(50);

  return NextResponse.json({ deployments: rows });
}

/** POST /api/deployments — trigger a new deployment */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveUserProject(session.user.id);
  if (!ctx) {
    return NextResponse.json({ error: "No project found" }, { status: 403 });
  }

  if (ctx.role !== "admin" && ctx.role !== "editor") {
    return NextResponse.json(
      { error: "Only admins and editors can trigger deployments" },
      { status: 403 },
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine for manual trigger
  }

  const validation = validateTriggerDeploymentRequest(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const commitMessage =
    validation.valid && "commitMessage" in validation
      ? (validation.commitMessage ?? "Manual Update")
      : "Manual Update";

  const commitSha =
    validation.valid && "commitSha" in validation
      ? (validation.commitSha ?? null)
      : null;

  const [deployment] = await db
    .insert(deployments)
    .values({
      projectId: ctx.project.id,
      status: "queued",
      commitSha,
      commitMessage,
    })
    .returning();

  // Simulate async build: mark in_progress after insert
  // In production this would be a background job
  await db
    .update(deployments)
    .set({ status: "in_progress", startedAt: new Date() })
    .where(eq(deployments.id, deployment.id));

  // Update the project status to deploying
  await db
    .update(projects)
    .set({ status: "deploying" })
    .where(eq(projects.id, ctx.project.id));

  // Simulate build completion after a short delay (fire-and-forget)
  simulateBuildCompletion(deployment.id, ctx.project.id);

  return NextResponse.json(
    { deployment: { ...deployment, status: "queued" } },
    { status: 201 },
  );
}

/** Simulate a build that completes after ~3 seconds */
function simulateBuildCompletion(deploymentId: string, projectId: string) {
  setTimeout(async () => {
    try {
      await db
        .update(deployments)
        .set({
          status: "succeeded",
          endedAt: new Date(),
        })
        .where(
          and(
            eq(deployments.id, deploymentId),
            eq(deployments.status, "in_progress"),
          ),
        );

      await db
        .update(projects)
        .set({ status: "active" })
        .where(eq(projects.id, projectId));
    } catch {
      // Silently handle — this is a simulation
    }
  }, 3000);
}
