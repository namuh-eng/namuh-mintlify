/**
 * POST /api/agent/jobs/{jobId}/messages — send a follow-up message
 *
 * Session-authenticated (dashboard use).
 */

import { db } from "@/lib/db";
import { agentJobs, orgMemberships, projects } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content || content.length === 0) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(agentJobs)
    .where(eq(agentJobs.id, jobId))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const job = rows[0];

  // Verify access
  const projectRows = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, job.projectId))
    .limit(1);

  if (projectRows.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "pending" && job.status !== "running") {
    return NextResponse.json(
      { error: `Cannot send messages to a ${job.status} job` },
      { status: 409 },
    );
  }

  const userMessage = {
    role: "user" as const,
    content,
    timestamp: new Date().toISOString(),
  };

  const agentReply = {
    role: "agent" as const,
    content: `Acknowledged. I'll incorporate your feedback: "${content.slice(0, 100)}${content.length > 100 ? "…" : ""}"`,
    timestamp: new Date(Date.now() + 1000).toISOString(),
  };

  const updatedMessages = [...job.messages, userMessage, agentReply];

  const [updatedJob] = await db
    .update(agentJobs)
    .set({ messages: updatedMessages, updatedAt: new Date() })
    .where(eq(agentJobs.id, jobId))
    .returning();

  return NextResponse.json({
    id: updatedJob.id,
    projectId: updatedJob.projectId,
    prompt: updatedJob.prompt,
    status: updatedJob.status,
    prUrl: updatedJob.prUrl,
    messages: updatedJob.messages,
    createdAt: updatedJob.createdAt.toISOString(),
    updatedAt: updatedJob.updatedAt.toISOString(),
  });
}
