/**
 * GET /api/assistant/settings — fetch assistant settings for the current user's project
 * PUT /api/assistant/settings — update assistant settings
 *
 * Session-authenticated (dashboard use).
 */

import { validateAssistantSettingsUpdate } from "@/lib/assistant-settings";
import { db } from "@/lib/db";
import { assistantSettings, orgMemberships, projects } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

async function resolveProject(userId: string) {
  const membership = await db
    .select({
      orgId: orgMemberships.orgId,
      role: orgMemberships.role,
    })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId))
    .limit(1);

  if (membership.length === 0) return null;

  const projectRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.orgId, membership[0].orgId))
    .orderBy(projects.createdAt)
    .limit(1);

  if (projectRows.length === 0) return null;

  return { projectId: projectRows[0].id, role: membership[0].role };
}

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveProject(session.user.id);
  if (!ctx) {
    return NextResponse.json({ error: "No project found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(assistantSettings)
    .where(eq(assistantSettings.projectId, ctx.projectId))
    .limit(1);

  const s = rows[0] ?? null;

  return NextResponse.json({
    settings: s
      ? {
          enabled: s.enabled,
          deflectionEnabled: s.deflectionEnabled,
          deflectionEmail: s.deflectionEmail,
          showHelpButton: s.showHelpButton,
          searchDomainsEnabled: s.searchDomainsEnabled,
          searchDomains: s.searchDomains,
          starterQuestionsEnabled: s.starterQuestionsEnabled,
          starterQuestions: s.starterQuestions,
        }
      : {
          enabled: false,
          deflectionEnabled: false,
          deflectionEmail: null,
          showHelpButton: false,
          searchDomainsEnabled: false,
          searchDomains: [],
          starterQuestionsEnabled: false,
          starterQuestions: [],
        },
  });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveProject(session.user.id);
  if (!ctx) {
    return NextResponse.json({ error: "No project found" }, { status: 404 });
  }

  if (ctx.role === "viewer") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = validateAssistantSettingsUpdate(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Upsert settings
  const existing = await db
    .select({ id: assistantSettings.id })
    .from(assistantSettings)
    .where(eq(assistantSettings.projectId, ctx.projectId))
    .limit(1);

  const updateValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  for (const [key, value] of Object.entries(validation.data)) {
    updateValues[key] = value;
  }

  if (existing.length > 0) {
    await db
      .update(assistantSettings)
      .set(updateValues)
      .where(eq(assistantSettings.projectId, ctx.projectId));
  } else {
    await db.insert(assistantSettings).values({
      projectId: ctx.projectId,
      ...updateValues,
    });
  }

  // Return updated settings
  const rows = await db
    .select()
    .from(assistantSettings)
    .where(eq(assistantSettings.projectId, ctx.projectId))
    .limit(1);

  const s = rows[0];

  return NextResponse.json({
    settings: {
      enabled: s.enabled,
      deflectionEnabled: s.deflectionEnabled,
      deflectionEmail: s.deflectionEmail,
      showHelpButton: s.showHelpButton,
      searchDomainsEnabled: s.searchDomainsEnabled,
      searchDomains: s.searchDomains,
      starterQuestionsEnabled: s.starterQuestionsEnabled,
      starterQuestions: s.starterQuestions,
    },
  });
}
