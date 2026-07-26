#!/usr/bin/env node
/**
 * Health-gated production deploy for Cloudflare Workers Containers.
 *
 * `wrangler deploy` exits 0 as soon as the rollout is accepted, so a container
 * image that never starts can stay live with a green workflow. This script
 * closes that hole:
 *
 *   1. Renders the gitignored production `wrangler.jsonc` from the committed
 *      `wrangler.example.jsonc` using non-secret repository variables only.
 *   2. Deploys, then polls `<PUBLIC_APP_URL>/api/health` inside a bounded
 *      attempt budget (never an unbounded wait).
 *   3. If health never reaches `status: "ok"`, redeploys the known-good image
 *      from `CONTAINER_KNOWN_GOOD_IMAGE` with the safe SEO mode forced on, then
 *      re-verifies health.
 *   4. Always fails the workflow when the requested deploy was unhealthy — even
 *      when the rollback restored service — so a rejected image is never
 *      reported as deployed.
 *
 * Secrets are never read or written here; Worker Secrets stay in Cloudflare.
 *
 * Usage:
 *   node scripts/deploy-health-gate.mjs                # deploy pinned known-good image
 *   node scripts/deploy-health-gate.mjs --mode build   # build + deploy a new image
 *   node scripts/deploy-health-gate.mjs --dry-run      # render + validate only
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { fileURLToPath } from "node:url";

/** Repository variables required for a production deploy. */
export const REQUIRED_DEPLOY_VARIABLES = [
  "CLOUDFLARE_ACCOUNT_ID",
  "PUBLIC_APP_URL",
  "S3_BUCKET",
  "S3_ENDPOINT",
  "CONTAINER_KNOWN_GOOD_IMAGE",
];

/**
 * Placeholders from the committed template that must never survive rendering.
 * A surviving placeholder would point production at the wrong domain or bucket,
 * so rendering fails closed instead of deploying it.
 */
const TEMPLATE_PLACEHOLDERS = [
  "docs.example.com",
  "your-doc-assets-bucket",
  "<account-id>",
  "<your-cloudflare-account-id>",
];

const PLACEHOLDER_APP_URL = "https://docs.example.com";

/**
 * Bounds so a hung container can neither pass the gate nor stall CI forever.
 *
 * `requiredSuccesses` guards against a false pass during a gradual container
 * rollout: a single probe can land on an instance still running the previous
 * image, so the gate requires consecutive healthy probes before accepting.
 */
export const HEALTH_POLL_BOUNDS = {
  minAttempts: 1,
  maxAttempts: 40,
  minIntervalMs: 1000,
  maxIntervalMs: 60000,
  defaultAttempts: 20,
  defaultIntervalMs: 15000,
  requiredSuccesses: 3,
};

/**
 * @typedef {Object} ProductionDeployVars
 * @property {string} [CLOUDFLARE_ACCOUNT_ID]
 * @property {string} [PUBLIC_APP_URL]
 * @property {string} [S3_BUCKET]
 * @property {string} [S3_ENDPOINT]
 * @property {string} [CONTAINER_KNOWN_GOOD_IMAGE]
 * @property {string} [SAFE_ROOT_ROBOTS]
 */

/**
 * `build` builds the Dockerfile, `known-good` pins the known-good image, and
 * `rollback` pins it and forces the safe SEO mode on.
 * @typedef {"build" | "known-good" | "rollback"} DeployMode
 */

/**
 * @param {string} source
 * @param {number} start index of the opening quote
 * @returns {number} index just past the closing quote
 */
function skipString(source, start) {
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

/**
 * Strips line and block comments without touching string literals.
 * @param {string} source
 * @returns {string}
 */
export function stripJsoncComments(source) {
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

/**
 * Strips trailing commas outside string literals.
 * @param {string} source
 * @returns {string}
 */
export function stripTrailingCommas(source) {
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

/**
 * @param {string} source
 * @returns {Record<string, unknown>}
 */
export function parseJsonc(source) {
  return JSON.parse(stripTrailingCommas(stripJsoncComments(source)));
}

/**
 * Validates a Cloudflare registry image reference. An explicit tag or digest is
 * required so a rollback can never resolve to a moving target.
 * @param {string | undefined} value
 * @returns {string}
 */
export function parseContainerImageRef(value) {
  const image = (value ?? "").trim();
  if (!image) {
    throw new Error(
      "CONTAINER_KNOWN_GOOD_IMAGE is required: set it to a registry image reference with an explicit :tag or @sha256 digest.",
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

  const digestMatch = /@sha256:([0-9a-f]*)$/.exec(image);
  if (digestMatch) {
    if (digestMatch[1].length !== 64) {
      throw new Error(
        `CONTAINER_KNOWN_GOOD_IMAGE digest must be 64 lowercase hex characters: "${image}"`,
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
  if (!lastSegment.includes(":") || lastSegment.endsWith(":")) {
    throw new Error(
      `CONTAINER_KNOWN_GOOD_IMAGE must include an explicit :tag or @sha256 digest: "${image}"`,
    );
  }
  return image;
}

/**
 * @param {string | undefined} value
 * @returns {{ appUrl: string; host: string }}
 */
export function parsePublicAppUrl(value) {
  const raw = (value ?? "").trim();
  if (!raw) throw new Error("PUBLIC_APP_URL is required.");

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`PUBLIC_APP_URL is not a valid URL: "${raw}"`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`PUBLIC_APP_URL must use https: "${raw}"`);
  }

  return { appUrl: url.origin, host: url.host };
}

/**
 * All missing variables at once, so one failed run reveals the whole gap.
 * @param {ProductionDeployVars} vars
 * @returns {string[]}
 */
export function missingDeployVariables(vars) {
  return REQUIRED_DEPLOY_VARIABLES.filter(
    (name) =>
      String(/** @type {Record<string, unknown>} */ (vars)[name] ?? "").trim()
        .length === 0,
  );
}

/**
 * Resolves the Worker's `SAFE_ROOT_ROBOTS` var. It defaults to "true" so a
 * dropped repository variable keeps the crawler-safe mode instead of silently
 * re-exposing SEO artifacts, and a rollback always forces it on.
 * @param {string | undefined} value
 * @param {DeployMode} [mode]
 * @returns {"true" | "false"}
 */
export function resolveSafeRootRobots(value, mode) {
  if (mode === "rollback") return "true";
  return (value ?? "").trim().toLowerCase() === "false" ? "false" : "true";
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} appUrl
 */
function replacePlaceholderUrls(record, appUrl) {
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string" && value.includes(PLACEHOLDER_APP_URL)) {
      record[key] = value.replaceAll(PLACEHOLDER_APP_URL, appUrl);
    }
  }
}

/**
 * @param {unknown} value
 * @param {string} field
 * @returns {Record<string, unknown>}
 */
function asRecord(value, field) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`wrangler template is missing an object "${field}" field.`);
  }
  return /** @type {Record<string, unknown>} */ (value);
}

/**
 * Renders the production `wrangler.jsonc` from the committed template using
 * only non-secret repository variables.
 * @param {{ templateSource: string; vars: ProductionDeployVars; mode?: DeployMode }} options
 * @returns {{ source: string; image: string; safeRootRobots: "true" | "false"; mode: DeployMode; healthUrl: string }}
 */
export function renderProductionWranglerConfig(options) {
  const { templateSource, vars } = options;
  const mode = options.mode ?? "known-good";

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
  const safeRootRobots = resolveSafeRootRobots(vars.SAFE_ROOT_ROBOTS, mode);

  const config = parseJsonc(templateSource);
  config.account_id = String(vars.CLOUDFLARE_ACCOUNT_ID).trim();
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
  if (mode !== "build") {
    // Deploy the exact prebuilt image; a Dockerfile build context would make
    // wrangler rebuild and republish, defeating the pin.
    container.image = knownGoodImage;
    delete container.image_build_context;
  }

  const workerVars = asRecord(config.vars, "vars");
  replacePlaceholderUrls(workerVars, appUrl);
  workerVars.S3_BUCKET = String(vars.S3_BUCKET).trim();
  workerVars.S3_ENDPOINT = String(vars.S3_ENDPOINT).trim();
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
    mode,
    healthUrl: healthUrl(appUrl),
  };
}

/**
 * Only an explicit `status: "ok"` body over HTTP 200 counts as healthy.
 * @param {number} status
 * @param {string} body
 * @returns {{ healthy: boolean; status: number; reason: string }}
 */
export function evaluateHealthPayload(status, body) {
  if (status !== 200) {
    return { healthy: false, status, reason: `http ${status}` };
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return { healthy: false, status, reason: "response body is not JSON" };
  }

  const reported =
    payload !== null && typeof payload === "object"
      ? payload.status
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

/**
 * @param {string} appUrl
 * @returns {string}
 */
export function healthUrl(appUrl) {
  return `${appUrl.replace(/\/+$/, "")}/api/health`;
}

/**
 * @param {number | undefined} value
 * @returns {number}
 */
export function clampAttempts(value) {
  const attempts = Number.isFinite(value)
    ? Math.trunc(/** @type {number} */ (value))
    : HEALTH_POLL_BOUNDS.defaultAttempts;
  return Math.min(
    HEALTH_POLL_BOUNDS.maxAttempts,
    Math.max(HEALTH_POLL_BOUNDS.minAttempts, attempts),
  );
}

/**
 * @param {number | undefined} value
 * @returns {number}
 */
export function clampIntervalMs(value) {
  const interval = Number.isFinite(value)
    ? Math.trunc(/** @type {number} */ (value))
    : HEALTH_POLL_BOUNDS.defaultIntervalMs;
  return Math.min(
    HEALTH_POLL_BOUNDS.maxIntervalMs,
    Math.max(HEALTH_POLL_BOUNDS.minIntervalMs, interval),
  );
}

/**
 * Polls until healthy or the bounded attempt budget is exhausted.
 *
 * Requires `requiredSuccesses` *consecutive* healthy probes. Container rollouts
 * are gradual, so one healthy response can come from an instance still running
 * the previous image; a single unhealthy probe resets the streak.
 * @param {{
 *   url: string;
 *   attempts?: number;
 *   intervalMs?: number;
 *   requiredSuccesses?: number;
 *   fetchImpl: (url: string) => Promise<{ status: number; text(): Promise<string> }>;
 *   sleep: (ms: number) => Promise<void>;
 *   log?: (message: string) => void;
 * }} options
 * @returns {Promise<{ healthy: boolean; attempts: number; reason: string }>}
 */
export async function pollHealth(options) {
  const attempts = clampAttempts(options.attempts);
  const intervalMs = clampIntervalMs(options.intervalMs);
  const requiredSuccesses = Math.min(
    attempts,
    Math.max(
      1,
      Number.isFinite(options.requiredSuccesses)
        ? Math.trunc(/** @type {number} */ (options.requiredSuccesses))
        : HEALTH_POLL_BOUNDS.requiredSuccesses,
    ),
  );
  const log = options.log ?? (() => {});
  let reason = "not attempted";
  let streak = 0;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await options.fetchImpl(options.url);
      const result = evaluateHealthPayload(
        response.status,
        await response.text(),
      );
      reason = result.reason;
      if (result.healthy) {
        streak += 1;
        log(
          `health ok on attempt ${attempt}/${attempts} (${streak}/${requiredSuccesses} consecutive)`,
        );
        if (streak >= requiredSuccesses) {
          return { healthy: true, attempts: attempt, reason };
        }
        if (attempt < attempts) await options.sleep(intervalMs);
        continue;
      }
    } catch (error) {
      reason = error instanceof Error ? error.message : "request failed";
    }

    if (streak > 0) {
      log(`health regressed after ${streak} consecutive ok probe(s)`);
    }
    streak = 0;
    log(`health attempt ${attempt}/${attempts} failed: ${reason}`);
    if (attempt < attempts) await options.sleep(intervalMs);
  }

  return {
    healthy: false,
    attempts,
    reason:
      streak > 0
        ? `only ${streak}/${requiredSuccesses} consecutive healthy probes before the attempt budget ran out`
        : reason,
  };
}

/**
 * Final workflow status. A rollback that restores service still fails the run
 * so the rejected image is never mistaken for a successful deploy.
 * @param {{ deployHealthy: boolean; rolledBack: boolean; rollbackHealthy?: boolean }} outcome
 * @returns {{ exitCode: number; message: string }}
 */
export function summarizeGateOutcome(outcome) {
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

/**
 * Orchestrates render -> deploy -> health -> rollback -> health.
 *
 * All side effects are injected so the sequencing is unit testable.
 * @param {{
 *   templateSource: string;
 *   vars: ProductionDeployVars;
 *   mode?: DeployMode;
 *   attempts?: number;
 *   intervalMs?: number;
 *   writeConfig: (source: string) => void;
 *   deploy: (context: { mode: DeployMode; image: string }) => Promise<void> | void;
 *   checkHealth: (url: string) => Promise<{ healthy: boolean; attempts: number; reason: string }>;
 *   log?: (message: string) => void;
 * }} deps
 * @returns {Promise<{ exitCode: number; message: string; deployHealthy: boolean; rolledBack: boolean; rollbackHealthy?: boolean; image: string; rollbackImage?: string }>}
 */
export async function runDeployGate(deps) {
  const log = deps.log ?? (() => {});
  const mode = deps.mode ?? "known-good";

  const rendered = renderProductionWranglerConfig({
    templateSource: deps.templateSource,
    vars: deps.vars,
    mode,
  });
  log(
    `deploying mode=${mode} image=${rendered.image} SAFE_ROOT_ROBOTS=${rendered.safeRootRobots}`,
  );
  deps.writeConfig(rendered.source);
  await deps.deploy({ mode, image: rendered.image });

  const health = await deps.checkHealth(rendered.healthUrl);
  if (health.healthy) {
    const summary = summarizeGateOutcome({
      deployHealthy: true,
      rolledBack: false,
    });
    log(summary.message);
    return {
      ...summary,
      deployHealthy: true,
      rolledBack: false,
      image: rendered.image,
    };
  }

  log(
    `health gate failed after ${health.attempts} attempt(s): ${health.reason}`,
  );

  const rollback = renderProductionWranglerConfig({
    templateSource: deps.templateSource,
    vars: deps.vars,
    mode: "rollback",
  });
  if (mode !== "build" && rollback.image === rendered.image) {
    // The failing deploy already ran the known-good image; redeploying it would
    // not restore service and would hide the real failure.
    const summary = summarizeGateOutcome({
      deployHealthy: false,
      rolledBack: false,
    });
    log(
      `skipping rollback: the failing deploy already used the known-good image ${rollback.image}`,
    );
    log(summary.message);
    return {
      ...summary,
      deployHealthy: false,
      rolledBack: false,
      image: rendered.image,
    };
  }

  log(
    `rolling back to known-good image ${rollback.image} with SAFE_ROOT_ROBOTS=${rollback.safeRootRobots}`,
  );
  deps.writeConfig(rollback.source);
  await deps.deploy({ mode: "rollback", image: rollback.image });
  const rollbackHealth = await deps.checkHealth(rollback.healthUrl);

  const summary = summarizeGateOutcome({
    deployHealthy: false,
    rolledBack: true,
    rollbackHealthy: rollbackHealth.healthy,
  });
  log(summary.message);
  return {
    ...summary,
    deployHealthy: false,
    rolledBack: true,
    rollbackHealthy: rollbackHealth.healthy,
    image: rendered.image,
    rollbackImage: rollback.image,
  };
}

/**
 * @param {string[]} argv
 * @returns {{ mode: DeployMode; dryRun: boolean }}
 */
export function parseCliArgs(argv) {
  /** @type {DeployMode} */
  let mode = "known-good";
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--mode" || arg.startsWith("--mode=")) {
      const value = arg.startsWith("--mode=")
        ? arg.slice("--mode=".length)
        : argv[++index];
      if (value !== "build" && value !== "known-good") {
        throw new Error(
          `--mode must be "build" or "known-good", got "${value ?? ""}"`,
        );
      }
      mode = value;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { mode, dryRun };
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {ProductionDeployVars}
 */
function varsFromEnv(env) {
  return {
    CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
    PUBLIC_APP_URL: env.PUBLIC_APP_URL,
    S3_BUCKET: env.S3_BUCKET,
    S3_ENDPOINT: env.S3_ENDPOINT,
    CONTAINER_KNOWN_GOOD_IMAGE: env.CONTAINER_KNOWN_GOOD_IMAGE,
    SAFE_ROOT_ROBOTS: env.SAFE_ROOT_ROBOTS,
  };
}

async function main() {
  const { mode, dryRun } = parseCliArgs(process.argv.slice(2));
  const log = (/** @type {string} */ message) => {
    console.log(`[deploy-gate] ${message}`);
  };
  const templateSource = readFileSync("wrangler.example.jsonc", "utf8");
  const vars = varsFromEnv(process.env);
  const attempts = Number(process.env.HEALTH_CHECK_ATTEMPTS);
  const intervalMs = Number(process.env.HEALTH_CHECK_INTERVAL_MS);
  const requiredSuccesses = Number(process.env.HEALTH_CHECK_REQUIRED_SUCCESSES);

  if (dryRun) {
    for (const dryMode of /** @type {DeployMode[]} */ ([mode, "rollback"])) {
      const rendered = renderProductionWranglerConfig({
        templateSource,
        vars,
        mode: dryMode,
      });
      log(
        `mode=${rendered.mode} image=${rendered.image} SAFE_ROOT_ROBOTS=${rendered.safeRootRobots} health=${rendered.healthUrl}`,
      );
    }
    return 0;
  }

  const result = await runDeployGate({
    templateSource,
    vars,
    mode,
    writeConfig: (source) => writeFileSync("wrangler.jsonc", source),
    deploy: ({ mode: deployMode }) => {
      const deployResult = spawnSync(
        "npx",
        [
          "wrangler",
          "deploy",
          "--config",
          "wrangler.jsonc",
          ...(deployMode === "rollback"
            ? ["--containers-rollout=immediate"]
            : []),
        ],
        { stdio: "inherit" },
      );
      if (deployResult.status !== 0) {
        throw new Error(`wrangler deploy exited ${deployResult.status}`);
      }
    },
    checkHealth: (url) =>
      pollHealth({
        url,
        attempts: Number.isFinite(attempts) ? attempts : undefined,
        intervalMs: Number.isFinite(intervalMs) ? intervalMs : undefined,
        requiredSuccesses: Number.isFinite(requiredSuccesses)
          ? requiredSuccesses
          : undefined,
        fetchImpl: (target) =>
          fetch(target, {
            redirect: "follow",
            headers: {
              accept: "application/json",
              // Cloudflare Browser Integrity Check rejects Node's default UA.
              "user-agent":
                "Mozilla/5.0 (compatible; OpenDocsDeploymentHealth/1.0)",
            },
          }),
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        log,
      }),
    log,
  });

  return result.exitCode;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then(
    (exitCode) => {
      process.exit(exitCode);
    },
    (error) => {
      console.error(
        `[deploy-gate] ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    },
  );
}
