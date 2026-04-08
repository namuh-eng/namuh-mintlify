/**
 * GET /api/workflows — list workflows for the current user's active project
 * POST /api/workflows — create a new workflow
 */

import { db } from "@/lib/db";
import { orgMemberships, projects, workflows } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

async function resolveProject(userId: string) {
  const membership = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId))
    .limit(1);

  if (membership.length === 0) return null;

  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.orgId, membership[0].orgId))
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
    return NextResponse.json({ workflows: [] });
  }

  const rows = await db
    .select()
    .from(workflows)
    .where(eq(workflows.projectId, project.id))
    .orderBy(desc(workflows.createdAt))
    .limit(50);

  return NextResponse.json({
    workflows: rows.map((w) => ({
      id: w.id,
      name: w.name,
      triggerType: w.triggerType,
      triggerConfig: w.triggerConfig,
      prompt: w.prompt,
      autoMerge: w.autoMerge,
      contextRepos: w.contextRepos,
      slackNotify: w.slackNotify,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })),
  });
}

interface CreateWorkflowBody {
  name?: string;
  triggerType?: string;
  triggerConfig?: {
    repos?: string[];
    frequency?: "daily" | "weekly" | "monthly" | "custom";
    time?: string;
    customCron?: string;
  };
  prompt?: string;
  autoMerge?: boolean;
  contextRepos?: string[];
  slackNotify?: boolean;
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

  let body: CreateWorkflowBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name || name.length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (name.length > 256) {
    return NextResponse.json(
      { error: "name must be 256 characters or less" },
      { status: 400 },
    );
  }

  const triggerType = body.triggerType;
  if (triggerType !== "on_pr_merge" && triggerType !== "on_schedule") {
    return NextResponse.json(
      { error: "triggerType must be 'on_pr_merge' or 'on_schedule'" },
      { status: 400 },
    );
  }

  const prompt = body.prompt?.trim();
  if (!prompt || prompt.length === 0) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  if (prompt.length > 10000) {
    return NextResponse.json(
      { error: "prompt must be 10000 characters or less" },
      { status: 400 },
    );
  }

  const [workflow] = await db
    .insert(workflows)
    .values({
      projectId: project.id,
      name,
      triggerType,
      triggerConfig: body.triggerConfig ?? {},
      prompt,
      autoMerge: body.autoMerge ?? true,
      contextRepos: body.contextRepos ?? [],
      slackNotify: body.slackNotify ?? false,
    })
    .returning();

  return NextResponse.json(
    {
      id: workflow.id,
      name: workflow.name,
      triggerType: workflow.triggerType,
      triggerConfig: workflow.triggerConfig,
      prompt: workflow.prompt,
      autoMerge: workflow.autoMerge,
      contextRepos: workflow.contextRepos,
      slackNotify: workflow.slackNotify,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
    },
    { status: 201 },
  );
}
