import { gte, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { session, user } from "@/lib/db/auth-schema";
import { organizations, projects } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import {
  authorizeOpsMetricsRequest,
  buildUsageReport,
  parseUsageWindowDays,
  usageWindowStart,
} from "@/lib/ops-usage-metrics";

/**
 * GET /api/admin/usage
 *
 * Instance-wide aggregate usage counters for the operator running this
 * deployment. Auth is a bearer `OPS_METRICS_TOKEN`; the endpoint fails closed
 * with 503 when that token is not configured. Per-org admin sessions are
 * intentionally rejected because these counts span every tenant.
 *
 * The response contains counts and calendar dates only — no names, emails,
 * user/org/project identifiers, IP addresses, user agents, or raw event rows.
 *
 * Query params: `days` (1-90, default 30).
 */
export async function GET(request: Request) {
  const requestId = createRequestId();
  const auth = authorizeOpsMetricsRequest(
    request.headers.get("authorization"),
    process.env.OPS_METRICS_TOKEN,
  );

  if (!auth.ok) {
    logger.warn("admin_usage_denied", {
      requestId,
      route: "/api/admin/usage",
      method: "GET",
      status: auth.status,
      reason: auth.reason,
    });
    return NextResponse.json(
      { error: auth.error, requestId },
      { status: auth.status },
    );
  }

  const windowDays = parseUsageWindowDays(
    new URL(request.url).searchParams.get("days"),
  );
  const generatedAt = new Date();
  const windowStart = usageWindowStart(windowDays, generatedAt);

  const countExpr = sql<number>`count(*)::int`;
  const distinctUsersExpr = sql<number>`count(distinct ${session.userId})::int`;
  const day = (column: AnyPgColumn) =>
    sql<string>`to_char(${column} at time zone 'UTC', 'YYYY-MM-DD')`;

  const [
    registeredUsers,
    usersRegisteredInWindow,
    activeUsers,
    signIns,
    orgTotals,
    orgsCreatedInWindow,
    projectTotals,
    projectsCreatedInWindow,
    dailyProjectCreations,
    dailySignIns,
  ] = await Promise.all([
    db.select({ count: countExpr }).from(user),
    db
      .select({ count: countExpr })
      .from(user)
      .where(gte(user.createdAt, windowStart)),
    db
      .select({ count: distinctUsersExpr })
      .from(session)
      .where(gte(session.createdAt, windowStart)),
    db
      .select({ count: countExpr })
      .from(session)
      .where(gte(session.createdAt, windowStart)),
    db.select({ count: countExpr }).from(organizations),
    db
      .select({ count: countExpr })
      .from(organizations)
      .where(gte(organizations.createdAt, windowStart)),
    db
      .select({
        total: countExpr,
        active: sql<number>`count(*) filter (where ${projects.status} = 'active')::int`,
      })
      .from(projects),
    db
      .select({ count: countExpr })
      .from(projects)
      .where(gte(projects.createdAt, windowStart)),
    db
      .select({ date: day(projects.createdAt), count: countExpr })
      .from(projects)
      .where(gte(projects.createdAt, windowStart))
      .groupBy(day(projects.createdAt))
      .orderBy(day(projects.createdAt)),
    db
      .select({ date: day(session.createdAt), count: countExpr })
      .from(session)
      .where(gte(session.createdAt, windowStart))
      .groupBy(day(session.createdAt))
      .orderBy(day(session.createdAt)),
  ]);

  const report = buildUsageReport({
    windowDays,
    windowStart,
    generatedAt,
    registeredUsers: registeredUsers[0]?.count,
    usersRegisteredInWindow: usersRegisteredInWindow[0]?.count,
    activeUsersInWindow: activeUsers[0]?.count,
    signInsInWindow: signIns[0]?.count,
    organizations: orgTotals[0]?.count,
    organizationsCreatedInWindow: orgsCreatedInWindow[0]?.count,
    projects: projectTotals[0]?.total,
    activeProjects: projectTotals[0]?.active,
    projectsCreatedInWindow: projectsCreatedInWindow[0]?.count,
    dailyProjectCreations,
    dailySignIns,
  });

  logger.info("admin_usage_reported", {
    requestId,
    route: "/api/admin/usage",
    method: "GET",
    windowDays,
  });

  return NextResponse.json(
    { ...report, requestId },
    { headers: { "cache-control": "no-store" } },
  );
}
