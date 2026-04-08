/**
 * GET /api/agent/jobs — list agent jobs for the current user's active project
 * POST /api/agent/jobs — create a new agent job
 *
 * Session-authenticated (dashboard use), not API-key-based.
 */

import { db } from "@/lib/db";
import { agentJobs, orgMemberships, projects } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

async function resolveProject(userId: string) {
  const membership = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId))
    .limit(1);

  if (membership.length === 0) return null;

  const orgId = membership[0].orgId;
  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.orgId, orgId))
    .orderBy(projects.createdAt)
    .limit(1);

  return projectRows[0] ?? null;
}

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await resolveProject(session.user.id);
  if (!project) {
    return NextResponse.json({ jobs: [] });
  }

  const jobs = await db
    .select()
    .from(agentJobs)
    .where(eq(agentJobs.projectId, project.id))
    .orderBy(desc(agentJobs.createdAt))
    .limit(50);

  return NextResponse.json({
    jobs: jobs.map((j) => ({
      id: j.id,
      prompt: j.prompt,
      status: j.status,
      prUrl: j.prUrl,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await resolveProject(session.user.id);
  if (!project) {
    return NextResponse.json({ error: "No project found" }, { status: 404 });
  }

  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt || prompt.length === 0) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  if (prompt.length > 5000) {
    return NextResponse.json(
      { error: "prompt must be 5000 characters or less" },
      { status: 400 },
    );
  }

  const initialMessages = [
    {
      role: "user" as const,
      content: prompt,
      timestamp: new Date().toISOString(),
    },
  ];

  const [job] = await db
    .insert(agentJobs)
    .values({
      projectId: project.id,
      prompt,
      status: "pending",
      messages: initialMessages,
    })
    .returning();

  // Simulate background processing
  simulateProcessing(job.id);

  return NextResponse.json(
    {
      id: job.id,
      prompt: job.prompt,
      status: job.status,
      prUrl: job.prUrl,
      messages: job.messages,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    },
    { status: 201 },
  );
}

function simulateProcessing(jobId: string) {
  setTimeout(async () => {
    try {
      await db
        .update(agentJobs)
        .set({ status: "running", updatedAt: new Date() })
        .where(and(eq(agentJobs.id, jobId), eq(agentJobs.status, "pending")));
    } catch {
      // fire-and-forget
    }
  }, 500);

  setTimeout(async () => {
    try {
      await db
        .update(agentJobs)
        .set({
          status: "succeeded",
          prUrl: `https://github.com/org/repo/pull/${Math.floor(Math.random() * 1000)}`,
          updatedAt: new Date(),
        })
        .where(and(eq(agentJobs.id, jobId), eq(agentJobs.status, "running")));
    } catch {
      // fire-and-forget
    }
  }, 5000);
}
