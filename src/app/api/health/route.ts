import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildHealthResponse } from "@/lib/health";
import { createRequestId, logger } from "@/lib/logger";

/**
 * GET /api/health
 * Public health check endpoint — no auth required.
 * Returns system status, version, uptime, and dependency checks.
 */
export async function GET() {
  const requestId = createRequestId();
  let dbConnected = false;
  let storageAvailable = false;

  logger.info("health_check_started", {
    requestId,
    route: "/api/health",
    method: "GET",
  });

  // Check database connectivity
  try {
    await db.execute(sql`SELECT 1`);
    dbConnected = true;
  } catch (error) {
    dbConnected = false;
    logger.warn("health_check_database_disconnected", {
      requestId,
      route: "/api/health",
      method: "GET",
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  // Keep liveness checks local: verify storage configuration without making a
  // network request. Providers may use either a region or endpoint + region.
  storageAvailable = Boolean(
    process.env.S3_BUCKET &&
      (process.env.AWS_REGION ||
        (process.env.S3_ENDPOINT && process.env.S3_REGION)),
  );

  const version = process.env.APP_VERSION ?? "0.1.0";

  const response = buildHealthResponse({
    dbConnected,
    storageAvailable,
    version,
    requestId,
  });

  logger.info("health_check_completed", {
    requestId,
    route: "/api/health",
    method: "GET",
    status: response.status,
    dbConnected,
    storageAvailable,
  });

  // Dependency state is reported in the body while the liveness response stays 200.
  return NextResponse.json(response, { status: 200 });
}
