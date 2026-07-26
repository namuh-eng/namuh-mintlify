import { describe, expect, it } from "vitest";
import { buildHealthResponse } from "@/lib/health";

describe("health response", () => {
  it("returns ok when all checks pass", () => {
    const response = buildHealthResponse({
      dbConnected: true,
      storageAvailable: true,
      version: "1.0.0",
      requestId: "req-health-ok",
      startTime: Date.now() - 60_000,
    });

    expect(response.status).toBe("ok");
    expect(response.checks).toEqual({
      database: "connected",
      storage: "available",
    });
    expect(response.version).toBe("1.0.0");
    expect(response.uptime).toBeGreaterThanOrEqual(59);
  });

  it.each([
    [false, true, "database", "disconnected"],
    [true, false, "storage", "unavailable"],
  ] as const)("returns degraded when a dependency is unavailable", (dbConnected, storageAvailable, dependency, expected) => {
    const response = buildHealthResponse({
      dbConnected,
      storageAvailable,
      version: "1.0.0",
      requestId: "req-health-degraded",
      startTime: Date.now(),
    });

    expect(response.status).toBe("degraded");
    expect(response.checks[dependency]).toBe(expected);
  });

  it("includes an ISO timestamp, uptime, and request id", () => {
    const startTime = Date.now() - 120_000;
    const response = buildHealthResponse({
      dbConnected: true,
      storageAvailable: true,
      version: "1.0.0",
      requestId: "req-health-trace",
      startTime,
    });

    expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(response.uptime).toBeGreaterThanOrEqual(119);
    expect(response.uptime).toBeLessThanOrEqual(121);
    expect(response.requestId).toBe("req-health-trace");
  });
});
