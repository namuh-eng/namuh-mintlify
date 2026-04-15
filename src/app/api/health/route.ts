import { db } from "@/lib/db";
import { buildHealthResponse } from "@/lib/deploy";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Public health check endpoint — no auth required.
 * Returns system status, version, uptime, and dependency checks.
 */
export async function GET() {
  let dbConnected = false;
  let storageAvailable = false;

  // Check database connectivity
  try {
    await db.execute(sql`SELECT 1`);
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  // Check S3 availability (just verify env var is set — actual S3 check is too slow for health)
  storageAvailable = Boolean(process.env.S3_BUCKET && process.env.AWS_REGION);

  const version = process.env.APP_VERSION ?? "0.1.0";

  const response = buildHealthResponse({
    dbConnected,
    storageAvailable,
    version,
  });

  // Always return 200 for container liveness checks (App Runner, ECS, K8s).
  // Degraded status is reported in the response body for monitoring dashboards.
  return NextResponse.json(response, { status: 200 });
}
