/**
 * Health-gated production deployment helpers.
 *
 * Cloudflare Workers Containers deploys are a rollout, not an atomic swap: a
 * broken image can stay live after `wrangler deploy` exits 0. These helpers let
 * CI (a) materialize the gitignored production `wrangler.jsonc` from the
 * committed template without ever embedding secrets, (b) poll `/api/health`
 * within a bounded budget, and (c) re-render a rollback config pinned to a
 * known-good image with the safe SEO mode forced on.
 *
 * Everything here is pure or dependency-injected so it can be unit tested.
 */

/** Repository-variable names required for a production deploy. */
export const REQUIRED_DEPLOY_VARIABLES = [
  "CLOUDFLARE_ACCOUNT_ID",
  "PUBLIC_APP_URL",
  "S3_BUCKET",
  "S3_ENDPOINT",
  "CONTAINER_KNOWN_GOOD_IMAGE",
] as const;

/**
 * Template placeholders that must never survive rendering. A silently unchanged
 * placeholder would deploy someone else's domain or bucket, so rendering fails
 * closed instead.
 */
const TEMPLATE_PLACEHOLDERS = [
  "docs.example.com",
  "your-doc-assets-bucket",
  "<account-id>",
  "<your-cloudflare-account-id>",
];

const PLACEHOLDER_APP_URL = "https://docs.example.com";

/** Bounds for health polling so a hung container can never stall CI forever. */
export const HEALTH_POLL_BOUNDS = {
  minAttempts: 1,
  maxAttempts: 40,
  minIntervalMs: 1_000,
  maxIntervalMs: 60_000,
  defaultAttempts: 20,
  defaultIntervalMs: 15_000,
} as const;

export interface ProductionDeployVars {
  CLOUDFLARE_ACCOUNT_ID?: string;
  PUBLIC_APP_URL?: string;
  S3_BUCKET?: string;
  S3_ENDPOINT?: string;
  CONTAINER_KNOWN_GOOD_IMAGE?: string;
  SAFE_ROOT_ROBOTS?: string;
}

export interface RenderConfigOptions {
  /** Contents of `wrangler.example.jsonc`. */
  templateSource: string;
  /** Repository variables (never secrets). */
  vars: ProductionDeployVars;
  /**
   * When true, pin `containers[].image` to `CONTAINER_KNOWN_GOOD_IMAGE`, drop
   * the Dockerfile build context, and force the safe SEO mode on.
   */
  rollback?: boolean;
}

export interface RenderedConfig {
  /** Serialized `wrangler.jsonc` contents. */
  source: string;
  /** Container image the config deploys (Dockerfile path or registry ref). */
  image: string;
  /** Effective value of the `SAFE_ROOT_ROBOTS` worker var. */
  safeRootRobots: string;
  rollback: boolean;
}

function skipString(source: string, start: number): number {
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === "\\") {
      index += 2;
      continue;
    }
    if (source[index] === '"') return index + 1;
    index += 1;
  }
  return index;
}

/** Removes `//` and block comments from JSONC without touching string bodies. */
export function stripJsoncComments(source: string): string {
  let out = "";
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (char === '"') {
      const end = skipString(source, index);
      out += source.slice(index, end);
      index = end;
      continue;
    }
    if (char === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (char === "/" && source[index + 1] === "*") {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        index += 1;
      }
      index += 2;
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
}

/** Removes trailing commas outside of string literals. */
export function stripTrailingCommas(source: string): string {
  let out = "";
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (char === '"') {
      const end = skipString(source, index);
      out += source.slice(index, end);
      index = end;
      continue;
    }
    if (char === ",") {
      let lookahead = index + 1;
      while (lookahead < source.length && /\s/.test(source[lookahead])) {
        lookahead += 1;
      }
      if (source[lookahead] === "}" || source[lookahead] === "]") {
        index += 1;
        continue;
      }
    }

    out += char;
    index += 1;
  }

  return out;
}

export function parseJsonc<T>(source: string): T {
  return JSON.parse(stripTrailingCommas(stripJsoncComments(source))) as T;
}

/**
 * Validates a container image reference for the Cloudflare managed registry.
 * Requires an explicit tag or digest so a rollback can never resolve to a
 * moving target.
 */
export function parseContainerImageRef(value: string | undefined): string {
  const image = (value ?? "").trim();
  if (!image) {
    throw new Error(
      "CONTAINER_KNOWN_GOOD_IMAGE is required: set it to a registry image reference with an explicit tag or @sha256 digest.",
    );
  }
  if (/\s/.test(image)) {
    throw new Error(
      `CONTAINER_KNOWN_GOOD_IMAGE must not contain whitespace: "${image}"`,
    );
  }
  if (image.includes("://")) {
    throw new Error(
      `CONTAINER_KNOWN_GOOD_IMAGE must not include a protocol: "${image}"`,
    );
  }

  const digestMatch = /@sha256:([0-9a-f]+)$/.exec(image);
  if (digestMatch) {
    if (digestMatch[1].length !== 64) {
      throw new Error(
        `CONTAINER_KNOWN_GOOD_IMAGE digest must be 64 hex characters: "${image}"`,
      );
    }
    return image;
  }
  if (image.includes("@")) {
    throw new Error(
      `CONTAINER_KNOWN_GOOD_IMAGE has an unsupported digest form; use @sha256:<64 hex>: "${image}"`,
    );
  }

  const lastSegment = image.slice(image.lastIndexOf("/") + 1);
  const tag = lastSegment.split(":")[1];
  if (!tag) {
    throw new Error(
      `CONTAINER_KNOWN_GOOD_IMAGE must include an explicit :tag or @sha256 digest: "${image}"`,
    );
  }
  return image;
}

/** Normalizes the public app URL and returns its origin plus route host. */
export function parsePublicAppUrl(value: string | undefined): {
  appUrl: string;
  host: string;
} {
  const raw = (value ?? "").trim();
  if (!raw) throw new Error("PUBLIC_APP_URL is required.");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`PUBLIC_APP_URL is not a valid URL: "${raw}"`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`PUBLIC_APP_URL must use https: "${raw}"`);
  }

  return { appUrl: `${url.origin}`, host: url.host };
}

/**
 * Missing repository variables, reported together so an operator fixes the
 * whole set in one pass instead of one failed run per variable.
 */
export function missingDeployVariables(vars: ProductionDeployVars): string[] {
  return REQUIRED_DEPLOY_VARIABLES.filter(
    (name) => (vars[name] ?? "").trim().length === 0,
  );
}

/**
 * `SAFE_ROOT_ROBOTS` defaults to "true": if the variable is ever dropped, the
 * deploy keeps the crawler-safe mode rather than silently re-exposing SEO
 * artifacts. Rollback always forces it on.
 */
export function resolveSafeRootRobots(
  value: string | undefined,
  rollback = false,
): string {
  if (rollback) return "true";
  return (value ?? "").trim().toLowerCase() === "false" ? "false" : "true";
}

function replacePlaceholderUrls(
  record: Record<string, unknown>,
  appUrl: string,
): void {
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string" && value.includes(PLACEHOLDER_APP_URL)) {
      record[key] = value.replaceAll(PLACEHOLDER_APP_URL, appUrl);
    }
  }
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`wrangler template is missing an object "${field}" field.`);
  }
  return value as Record<string, unknown>;
}

/**
 * Renders the production `wrangler.jsonc` from the committed template.
 *
 * Only non-secret repository variables are injected; Worker Secrets stay in
 * Cloudflare and are never written to disk.
 */
export function renderProductionWranglerConfig(
  options: RenderConfigOptions,
): RenderedConfig {
  const { templateSource, vars, rollback = false } = options;

  const missing = missingDeployVariables(vars);
  if (missing.length > 0) {
    throw new Error(
      `Missing required repository variables: ${missing.join(", ")}`,
    );
  }

  const knownGoodImage = parseContainerImageRef(
    vars.CONTAINER_KNOWN_GOOD_IMAGE,
  );
  const { appUrl, host } = parsePublicAppUrl(vars.PUBLIC_APP_URL);
  const safeRootRobots = resolveSafeRootRobots(vars.SAFE_ROOT_ROBOTS, rollback);

  const config = parseJsonc<Record<string, unknown>>(templateSource);
  config.account_id = (vars.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
  config.routes = [{ pattern: host, custom_domain: true }];

  const containers = config.containers;
  if (!Array.isArray(containers) || containers.length !== 1) {
    throw new Error(
      "wrangler template must declare exactly one container app.",
    );
  }
  const container = asRecord(containers[0], "containers[0]");
  replacePlaceholderUrls(
    asRecord(container.image_vars, "containers[0].image_vars"),
    appUrl,
  );
  if (rollback) {
    container.image = knownGoodImage;
    delete container.image_build_context;
  }

  const workerVars = asRecord(config.vars, "vars");
  replacePlaceholderUrls(workerVars, appUrl);
  workerVars.S3_BUCKET = (vars.S3_BUCKET ?? "").trim();
  workerVars.S3_ENDPOINT = (vars.S3_ENDPOINT ?? "").trim();
  workerVars.SAFE_ROOT_ROBOTS = safeRootRobots;

  const source = `${JSON.stringify(config, null, 2)}\n`;
  const leftover = TEMPLATE_PLACEHOLDERS.filter((placeholder) =>
    source.includes(placeholder),
  );
  if (leftover.length > 0) {
    throw new Error(
      `Rendered wrangler config still contains template placeholders: ${leftover.join(", ")}`,
    );
  }

  return {
    source,
    image: String(container.image),
    safeRootRobots,
    rollback,
  };
}

export interface HealthProbeResult {
  healthy: boolean;
  status?: number;
  reason: string;
}

/** The gate accepts only an explicit `status: "ok"` body over HTTP 200. */
export function evaluateHealthPayload(
  status: number,
  body: string,
): HealthProbeResult {
  if (status !== 200) {
    return { healthy: false, status, reason: `http ${status}` };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return { healthy: false, status, reason: "response body is not JSON" };
  }

  const reported =
    payload !== null && typeof payload === "object"
      ? (payload as { status?: unknown }).status
      : undefined;
  if (reported === "ok") {
    return { healthy: true, status, reason: "ok" };
  }

  return {
    healthy: false,
    status,
    reason: `health status ${typeof reported === "string" ? reported : "missing"}`,
  };
}

export function healthUrl(appUrl: string): string {
  return `${appUrl.replace(/\/+$/, "")}/api/health`;
}

export function clampAttempts(value: number | undefined): number {
  const attempts = Number.isFinite(value)
    ? Math.trunc(value as number)
    : HEALTH_POLL_BOUNDS.defaultAttempts;
  return Math.min(
    HEALTH_POLL_BOUNDS.maxAttempts,
    Math.max(HEALTH_POLL_BOUNDS.minAttempts, attempts),
  );
}

export function clampIntervalMs(value: number | undefined): number {
  const interval = Number.isFinite(value)
    ? Math.trunc(value as number)
    : HEALTH_POLL_BOUNDS.defaultIntervalMs;
  return Math.min(
    HEALTH_POLL_BOUNDS.maxIntervalMs,
    Math.max(HEALTH_POLL_BOUNDS.minIntervalMs, interval),
  );
}

export interface PollHealthOptions {
  url: string;
  attempts?: number;
  intervalMs?: number;
  fetchImpl: (url: string) => Promise<{ status: number; text(): Promise<string> }>;
  sleep: (ms: number) => Promise<void>;
  log?: (message: string) => void;
}

export interface PollHealthResult {
  healthy: boolean;
  attempts: number;
  reason: string;
}

/** Polls until healthy or the bounded attempt budget is exhausted. */
export async function pollHealth(
  options: PollHealthOptions,
): Promise<PollHealthResult> {
  const attempts = clampAttempts(options.attempts);
  const intervalMs = clampIntervalMs(options.intervalMs);
  const log = options.log ?? (() => {});
  let reason = "not attempted";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await options.fetchImpl(options.url);
      const result = evaluateHealthPayload(response.status, await response.text());
      reason = result.reason;
      if (result.healthy) {
        log(`health ok on attempt ${attempt}/${attempts}`);
        return { healthy: true, attempts: attempt, reason };
      }
    } catch (error) {
      reason = error instanceof Error ? error.message : "request failed";
    }

    log(`health attempt ${attempt}/${attempts} failed: ${reason}`);
    if (attempt < attempts) await options.sleep(intervalMs);
  }

  return { healthy: false, attempts, reason };
}

export interface GateOutcome {
  deployHealthy: boolean;
  rolledBack: boolean;
  rollbackHealthy?: boolean;
}

/**
 * Final workflow status. A rollback that restores service still fails the run:
 * the rejected image must not be mistaken for a successful deploy.
 */
export function summarizeGateOutcome(outcome: GateOutcome): {
  exitCode: number;
  message: string;
} {
  if (outcome.deployHealthy) {
    return { exitCode: 0, message: "Deployment healthy." };
  }
  if (!outcome.rolledBack) {
    return {
      exitCode: 1,
      message:
        "Deployment failed health checks and no rollback ran — production may be serving an unhealthy image.",
    };
  }
  if (outcome.rollbackHealthy) {
    return {
      exitCode: 1,
      message:
        "Deployment failed health checks; rolled back to the known-good image and service is healthy again. Failing the run so the rejected image is not treated as deployed.",
    };
  }
  return {
    exitCode: 1,
    message:
      "Deployment failed health checks and the rollback to the known-good image is still unhealthy — production needs manual intervention.",
  };
}
