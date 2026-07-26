/**
 * Operator usage metrics — authorization gate and aggregate-only response
 * shaping for the instance-wide usage endpoint.
 *
 * Privacy contract: this module may only ever emit non-negative integer counts
 * and ISO calendar dates. Names, emails, user/org/project identifiers, IP
 * addresses, user agents and raw event rows must never reach the response.
 * `buildUsageReport` re-constructs the payload from scratch so a future query
 * change cannot leak an identifier by accident.
 */

import { createHash, timingSafeEqual } from "node:crypto";

export const USAGE_WINDOW_DEFAULT_DAYS = 30;
export const USAGE_WINDOW_MIN_DAYS = 1;
export const USAGE_WINDOW_MAX_DAYS = 90;

/** Minimum operator token length. Short tokens are treated as unconfigured. */
export const OPS_METRICS_TOKEN_MIN_LENGTH = 32;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type OpsAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 503; error: string; reason: string };

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Authorize an operator metrics request.
 *
 * Fails closed: when no sufficiently long `OPS_METRICS_TOKEN` is configured the
 * endpoint reports 503 rather than falling back to session or org-role auth.
 * Instance-wide counts span every tenant, so a per-org admin role is
 * deliberately *not* accepted here.
 */
export function authorizeOpsMetricsRequest(
  authorizationHeader: string | null | undefined,
  configuredToken: string | null | undefined,
): OpsAuthResult {
  const token = (configuredToken ?? "").trim();
  if (token.length < OPS_METRICS_TOKEN_MIN_LENGTH) {
    return {
      ok: false,
      status: 503,
      error: "Usage metrics endpoint is not configured",
      reason: token.length === 0 ? "token_unset" : "token_too_short",
    };
  }

  const header = (authorizationHeader ?? "").trimStart();
  if (!header.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
      reason: "missing_bearer_token",
    };
  }

  const presented = header.slice("bearer ".length).trim();
  if (presented.length === 0) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
      reason: "empty_bearer_token",
    };
  }

  // Compare fixed-width digests so neither value nor length is leaked by timing.
  if (!timingSafeEqual(digest(presented), digest(token))) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden",
      reason: "token_mismatch",
    };
  }

  return { ok: true };
}

/** Clamp a `?days=` query param into the supported bounded window. */
export function parseUsageWindowDays(raw: string | null | undefined): number {
  const parsed = Number.parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) return USAGE_WINDOW_DEFAULT_DAYS;
  return Math.min(
    Math.max(parsed, USAGE_WINDOW_MIN_DAYS),
    USAGE_WINDOW_MAX_DAYS,
  );
}

/** Start of the bounded window, exclusive of anything older. */
export function usageWindowStart(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/** Coerce any query result value into a safe non-negative integer count. */
export function toCount(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.floor(numeric);
}

export interface DailyCount {
  date: string;
  count: number;
}

/**
 * Keep only `{ date, count }` pairs with a well-formed calendar date. Rows with
 * any other shape are dropped rather than passed through.
 */
export function toDailyCounts(rows: unknown): DailyCount[] {
  if (!Array.isArray(rows)) return [];
  const result: DailyCount[] = [];
  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;
    const date = (row as { date?: unknown }).date;
    if (typeof date !== "string" || !ISO_DATE_RE.test(date)) continue;
    result.push({ date, count: toCount((row as { count?: unknown }).count) });
  }
  return result;
}

export interface UsageReportInput {
  windowDays: number;
  windowStart: Date;
  generatedAt: Date;
  registeredUsers: unknown;
  usersRegisteredInWindow: unknown;
  activeUsersInWindow: unknown;
  signInsInWindow: unknown;
  organizations: unknown;
  organizationsCreatedInWindow: unknown;
  projects: unknown;
  activeProjects: unknown;
  projectsCreatedInWindow: unknown;
  dailyProjectCreations: unknown;
  dailySignIns: unknown;
}

export interface UsageReport {
  window: { days: number; start: string; end: string };
  users: {
    registered: number;
    registeredInWindow: number;
    activeInWindow: number;
    signInsInWindow: number;
  };
  organizations: { total: number; createdInWindow: number };
  projects: { total: number; active: number; createdInWindow: number };
  recentActivity: {
    projectCreationsByDay: DailyCount[];
    signInsByDay: DailyCount[];
  };
}

/**
 * Build the aggregate-only response payload. Every field is re-derived here, so
 * only integers and ISO timestamps/dates can appear in the output.
 */
export function buildUsageReport(input: UsageReportInput): UsageReport {
  return {
    window: {
      days: input.windowDays,
      start: input.windowStart.toISOString(),
      end: input.generatedAt.toISOString(),
    },
    users: {
      registered: toCount(input.registeredUsers),
      registeredInWindow: toCount(input.usersRegisteredInWindow),
      activeInWindow: toCount(input.activeUsersInWindow),
      signInsInWindow: toCount(input.signInsInWindow),
    },
    organizations: {
      total: toCount(input.organizations),
      createdInWindow: toCount(input.organizationsCreatedInWindow),
    },
    projects: {
      total: toCount(input.projects),
      active: toCount(input.activeProjects),
      createdInWindow: toCount(input.projectsCreatedInWindow),
    },
    recentActivity: {
      projectCreationsByDay: toDailyCounts(input.dailyProjectCreations),
      signInsByDay: toDailyCounts(input.dailySignIns),
    },
  };
}
