import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authorizeOpsMetricsRequest,
  buildUsageReport,
  OPS_METRICS_TOKEN_MIN_LENGTH,
  parseUsageWindowDays,
  toCount,
  toDailyCounts,
  USAGE_WINDOW_DEFAULT_DAYS,
  USAGE_WINDOW_MAX_DAYS,
  USAGE_WINDOW_MIN_DAYS,
  usageWindowStart,
} from "@/lib/ops-usage-metrics";

const TOKEN = "a".repeat(OPS_METRICS_TOKEN_MIN_LENGTH);

describe("authorizeOpsMetricsRequest", () => {
  it("fails closed with 503 when no token is configured", () => {
    const result = authorizeOpsMetricsRequest(`Bearer ${TOKEN}`, undefined);
    expect(result).toEqual({
      ok: false,
      status: 503,
      error: "Usage metrics endpoint is not configured",
      reason: "token_unset",
    });
  });

  it("fails closed with 503 for a too-short configured token", () => {
    const short = "b".repeat(OPS_METRICS_TOKEN_MIN_LENGTH - 1);
    const result = authorizeOpsMetricsRequest(`Bearer ${short}`, short);
    expect(result).toMatchObject({
      ok: false,
      status: 503,
      reason: "token_too_short",
    });
  });

  it("returns 401 when the Authorization header is missing", () => {
    expect(authorizeOpsMetricsRequest(null, TOKEN)).toMatchObject({
      ok: false,
      status: 401,
      reason: "missing_bearer_token",
    });
  });

  it("returns 401 for a non-bearer scheme", () => {
    expect(authorizeOpsMetricsRequest(`Basic ${TOKEN}`, TOKEN)).toMatchObject({
      ok: false,
      status: 401,
      reason: "missing_bearer_token",
    });
  });

  it("returns 401 for an empty bearer value", () => {
    expect(authorizeOpsMetricsRequest("Bearer    ", TOKEN)).toMatchObject({
      ok: false,
      status: 401,
      reason: "empty_bearer_token",
    });
  });

  it("returns 403 for a wrong token of the same length", () => {
    const wrong = "c".repeat(OPS_METRICS_TOKEN_MIN_LENGTH);
    expect(authorizeOpsMetricsRequest(`Bearer ${wrong}`, TOKEN)).toMatchObject({
      ok: false,
      status: 403,
      reason: "token_mismatch",
    });
  });

  it("returns 403 for a wrong token of a different length without throwing", () => {
    expect(
      authorizeOpsMetricsRequest(`Bearer ${TOKEN}extra`, TOKEN),
    ).toMatchObject({ ok: false, status: 403, reason: "token_mismatch" });
  });

  it("accepts the exact token and is case-insensitive on the scheme", () => {
    expect(authorizeOpsMetricsRequest(`Bearer ${TOKEN}`, TOKEN)).toEqual({
      ok: true,
    });
    expect(authorizeOpsMetricsRequest(`bearer ${TOKEN}`, ` ${TOKEN} `)).toEqual(
      { ok: true },
    );
  });
});

describe("parseUsageWindowDays", () => {
  it("defaults when the param is absent or unparseable", () => {
    expect(parseUsageWindowDays(null)).toBe(USAGE_WINDOW_DEFAULT_DAYS);
    expect(parseUsageWindowDays("")).toBe(USAGE_WINDOW_DEFAULT_DAYS);
    expect(parseUsageWindowDays("abc")).toBe(USAGE_WINDOW_DEFAULT_DAYS);
  });

  it("clamps to the supported bounds", () => {
    expect(parseUsageWindowDays("0")).toBe(USAGE_WINDOW_MIN_DAYS);
    expect(parseUsageWindowDays("-5")).toBe(USAGE_WINDOW_MIN_DAYS);
    expect(parseUsageWindowDays("100000")).toBe(USAGE_WINDOW_MAX_DAYS);
  });

  it("passes through in-range values", () => {
    expect(parseUsageWindowDays("7")).toBe(7);
    expect(parseUsageWindowDays(String(USAGE_WINDOW_MAX_DAYS))).toBe(
      USAGE_WINDOW_MAX_DAYS,
    );
  });
});

describe("usageWindowStart", () => {
  it("subtracts exactly N days from the reference time", () => {
    const now = new Date("2026-07-26T00:00:00.000Z");
    expect(usageWindowStart(7, now).toISOString()).toBe(
      "2026-07-19T00:00:00.000Z",
    );
  });
});

describe("toCount", () => {
  it("coerces driver-shaped values into non-negative integers", () => {
    expect(toCount(5)).toBe(5);
    expect(toCount("12")).toBe(12);
    expect(toCount(3.9)).toBe(3);
  });

  it("returns 0 for missing, negative, or non-numeric values", () => {
    expect(toCount(undefined)).toBe(0);
    expect(toCount(null)).toBe(0);
    expect(toCount("not-a-number")).toBe(0);
    expect(toCount(-4)).toBe(0);
    expect(toCount({ count: 1 })).toBe(0);
  });
});

describe("toDailyCounts", () => {
  it("keeps only well-formed date/count pairs", () => {
    expect(
      toDailyCounts([
        { date: "2026-07-01", count: 3 },
        { date: "2026-07-02", count: "4" },
      ]),
    ).toEqual([
      { date: "2026-07-01", count: 3 },
      { date: "2026-07-02", count: 4 },
    ]);
  });

  it("drops rows with a malformed or missing date", () => {
    expect(
      toDailyCounts([
        { date: "not-a-date", count: 3 },
        { date: null, count: 3 },
        { count: 3 },
        null,
        "row",
      ]),
    ).toEqual([]);
  });

  it("never carries identifier fields through", () => {
    const rows = [
      {
        date: "2026-07-01",
        count: 2,
        userId: "user-1",
        email: "a@example.com",
        orgId: "org-1",
      },
    ];
    expect(toDailyCounts(rows)).toEqual([{ date: "2026-07-01", count: 2 }]);
  });

  it("returns an empty list for non-array input", () => {
    expect(toDailyCounts(undefined)).toEqual([]);
    expect(toDailyCounts({ rows: [] })).toEqual([]);
  });
});

describe("buildUsageReport", () => {
  const base = {
    windowDays: 30,
    windowStart: new Date("2026-06-26T00:00:00.000Z"),
    generatedAt: new Date("2026-07-26T00:00:00.000Z"),
    registeredUsers: 42,
    usersRegisteredInWindow: 5,
    activeUsersInWindow: 11,
    signInsInWindow: 87,
    organizations: 9,
    organizationsCreatedInWindow: 2,
    projects: 30,
    activeProjects: 26,
    projectsCreatedInWindow: 4,
    dailyProjectCreations: [{ date: "2026-07-25", count: 2 }],
    dailySignIns: [{ date: "2026-07-25", count: 6 }],
  };

  it("aggregates counts into the documented shape", () => {
    expect(buildUsageReport(base)).toEqual({
      window: {
        days: 30,
        start: "2026-06-26T00:00:00.000Z",
        end: "2026-07-26T00:00:00.000Z",
      },
      users: {
        registered: 42,
        registeredInWindow: 5,
        activeInWindow: 11,
        signInsInWindow: 87,
      },
      organizations: { total: 9, createdInWindow: 2 },
      projects: { total: 30, active: 26, createdInWindow: 4 },
      recentActivity: {
        projectCreationsByDay: [{ date: "2026-07-25", count: 2 }],
        signInsByDay: [{ date: "2026-07-25", count: 6 }],
      },
    });
  });

  it("degrades missing aggregates to zero instead of null/undefined", () => {
    const report = buildUsageReport({
      ...base,
      registeredUsers: undefined,
      activeUsersInWindow: null,
      projects: undefined,
      activeProjects: undefined,
      dailySignIns: undefined,
    });
    expect(report.users.registered).toBe(0);
    expect(report.users.activeInWindow).toBe(0);
    expect(report.projects).toEqual({
      total: 0,
      active: 0,
      createdInWindow: 4,
    });
    expect(report.recentActivity.signInsByDay).toEqual([]);
  });

  it("emits no PII even when the query rows carry identifiers", () => {
    const report = buildUsageReport({
      ...base,
      dailyProjectCreations: [
        {
          date: "2026-07-25",
          count: 2,
          projectId: "proj-1",
          ownerEmail: "owner@example.com",
        },
      ],
      dailySignIns: [
        { date: "2026-07-25", count: 6, ipAddress: "203.0.113.5" },
      ],
    });
    const serialized = JSON.stringify(report);
    for (const forbidden of [
      "proj-1",
      "owner@example.com",
      "203.0.113.5",
      "projectId",
      "ownerEmail",
      "ipAddress",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

// ── Route-level authorization ────────────────────────────────────────────────

const selectMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: { select: selectMock },
}));

describe("GET /api/admin/usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  function makeRequest(headers: Record<string, string> = {}, days?: string) {
    const url = new URL("http://localhost/api/admin/usage");
    if (days !== undefined) url.searchParams.set("days", days);
    return new Request(url, { headers });
  }

  it("returns 503 and never touches the database when unconfigured", async () => {
    vi.stubEnv("OPS_METRICS_TOKEN", "");
    const { GET } = await import("@/app/api/admin/usage/route");
    const response = await GET(
      makeRequest({ authorization: `Bearer ${TOKEN}` }),
    );

    expect(response.status).toBe(503);
    expect(selectMock).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body.error).toBe("Usage metrics endpoint is not configured");
    expect(body).not.toHaveProperty("users");
  });

  it("returns 401 without a bearer token and never queries", async () => {
    vi.stubEnv("OPS_METRICS_TOKEN", TOKEN);
    const { GET } = await import("@/app/api/admin/usage/route");
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(selectMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: "Unauthorized",
    });
  });

  it("returns 403 for a wrong bearer token and never queries", async () => {
    vi.stubEnv("OPS_METRICS_TOKEN", TOKEN);
    const { GET } = await import("@/app/api/admin/usage/route");
    const response = await GET(
      makeRequest({ authorization: `Bearer ${"z".repeat(TOKEN.length)}` }),
    );

    expect(response.status).toBe(403);
    expect(selectMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: "Forbidden",
    });
  });

  it("returns aggregate counts only for an authorized operator", async () => {
    vi.stubEnv("OPS_METRICS_TOKEN", TOKEN);

    const results: unknown[] = [
      [{ count: 42 }], // registered users
      [{ count: 5 }], // users registered in window
      [{ count: 11 }], // active users
      [{ count: 87 }], // sign-ins
      [{ count: 9 }], // organizations
      [{ count: 2 }], // organizations created in window
      [{ total: 30, active: 26 }], // project totals
      [{ count: 4 }], // projects created in window
      [{ date: "2026-07-25", count: 2, projectId: "proj-1" }],
      [{ date: "2026-07-25", count: 6, ipAddress: "203.0.113.5" }],
    ];

    let call = 0;
    selectMock.mockImplementation(() => {
      const value = results[call++];
      const builder: Record<string, unknown> = {};
      for (const method of ["from", "where", "groupBy", "orderBy"]) {
        builder[method] = vi.fn(() => builder);
      }
      // Drizzle query builders are genuinely thenable — awaiting one runs the
      // query. The stub must mirror that to exercise the real route path.
      // biome-ignore lint/suspicious/noThenProperty: models a Drizzle query builder
      builder.then = (
        resolve: (value: unknown) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise.resolve(value).then(resolve, reject);
      return builder;
    });

    const { GET } = await import("@/app/api/admin/usage/route");
    const response = await GET(
      makeRequest({ authorization: `Bearer ${TOKEN}` }, "7"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const body = await response.json();
    expect(body.window.days).toBe(7);
    expect(body.users).toEqual({
      registered: 42,
      registeredInWindow: 5,
      activeInWindow: 11,
      signInsInWindow: 87,
    });
    expect(body.organizations).toEqual({ total: 9, createdInWindow: 2 });
    expect(body.projects).toEqual({
      total: 30,
      active: 26,
      createdInWindow: 4,
    });
    expect(body.recentActivity.projectCreationsByDay).toEqual([
      { date: "2026-07-25", count: 2 },
    ]);
    expect(body.recentActivity.signInsByDay).toEqual([
      { date: "2026-07-25", count: 6 },
    ]);

    const serialized = JSON.stringify(body);
    for (const forbidden of [
      "proj-1",
      "203.0.113.5",
      "projectId",
      "ipAddress",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
