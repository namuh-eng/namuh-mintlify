export interface HealthCheckResponse {
  status: "ok" | "degraded" | "error";
  version: string;
  timestamp: string;
  uptime: number;
  requestId: string;
  checks: {
    database: "connected" | "disconnected";
    storage: "available" | "unavailable";
  };
}

const APP_START_TIME = Date.now();

export function buildHealthResponse(overrides: {
  dbConnected: boolean;
  storageAvailable: boolean;
  version: string;
  requestId: string;
  startTime?: number;
}): HealthCheckResponse {
  const startTime = overrides.startTime ?? APP_START_TIME;
  return {
    status:
      overrides.dbConnected && overrides.storageAvailable ? "ok" : "degraded",
    version: overrides.version,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    requestId: overrides.requestId,
    checks: {
      database: overrides.dbConnected ? "connected" : "disconnected",
      storage: overrides.storageAvailable ? "available" : "unavailable",
    },
  };
}
