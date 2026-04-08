import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, projects } from "@/lib/db/schema";
import { fetchSpecFromUrl } from "@/lib/openapi";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

async function getUserOrgId(userId: string): Promise<string | null> {
  const membership = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId))
    .limit(1);
  return membership.length > 0 ? membership[0].orgId : null;
}

/**
 * GET /api/projects/[id]/openapi-spec — get the stored OpenAPI spec
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = await getUserOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const result = await db
    .select({ settings: projects.settings })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.orgId, orgId)))
    .limit(1);

  if (result.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const settings = (result[0].settings || {}) as Record<string, unknown>;
  const spec = settings.openApiSpec || null;
  const specUrl = settings.openApiSpecUrl || "";

  return NextResponse.json({ spec, specUrl });
}

/**
 * POST /api/projects/[id]/openapi-spec — fetch spec from URL and store it
 *
 * Body: { url: string } or { spec: object } (inline)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = await getUserOrgId(session.user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  let spec: Record<string, unknown> | null = null;

  if (body.url && typeof body.url === "string") {
    spec = await fetchSpecFromUrl(body.url);
    if (!spec) {
      return NextResponse.json(
        { error: "Failed to fetch spec from URL" },
        { status: 400 },
      );
    }
  } else if (body.spec && typeof body.spec === "object") {
    spec = body.spec as Record<string, unknown>;
  } else {
    return NextResponse.json(
      { error: "Provide either url or spec in request body" },
      { status: 400 },
    );
  }

  // Validate it's a valid OpenAPI or AsyncAPI spec
  const isOpenApi =
    typeof spec.openapi === "string" || typeof spec.swagger === "string";
  const isAsyncApi = typeof spec.asyncapi === "string";

  if (!isOpenApi && !isAsyncApi) {
    return NextResponse.json(
      { error: "Invalid spec: must be OpenAPI 3.x, Swagger 2.x, or AsyncAPI" },
      { status: 400 },
    );
  }

  // Store spec in project settings
  const existing = await db
    .select({ settings: projects.settings })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.orgId, orgId)))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const currentSettings = (existing[0].settings || {}) as Record<
    string,
    unknown
  >;

  await db
    .update(projects)
    .set({
      settings: {
        ...currentSettings,
        openApiSpec: spec,
        openApiSpecUrl: body.url || currentSettings.openApiSpecUrl || "",
      },
    })
    .where(eq(projects.id, id));

  return NextResponse.json({
    ok: true,
    specType: isAsyncApi ? "asyncapi" : "openapi",
  });
}
