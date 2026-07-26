import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  clampAttempts,
  clampIntervalMs,
  evaluateHealthPayload,
  HEALTH_POLL_BOUNDS,
  healthUrl,
  missingDeployVariables,
  parseCliArgs,
  parseContainerImageRef,
  parseJsonc,
  parsePublicAppUrl,
  pollHealth,
  REQUIRED_DEPLOY_VARIABLES,
  renderProductionWranglerConfig,
  resolveSafeRootRobots,
  runDeployGate,
  summarizeGateOutcome,
} from "../scripts/deploy-health-gate.mjs";

const templateSource = readFileSync("wrangler.example.jsonc", "utf8");
const workflowSource = readFileSync(".github/workflows/deploy.yml", "utf8");
const workerSource = readFileSync("worker/index.ts", "utf8");

const KNOWN_GOOD_DIGEST =
  "1ebd786f620fd305e59eca2bc7647b833af9a282571196ea5c5f3ef2f5a26127";

const vars = {
  CLOUDFLARE_ACCOUNT_ID: "acct-1234",
  PUBLIC_APP_URL: "https://opendocs.example.net",
  S3_BUCKET: "prod-doc-assets",
  S3_ENDPOINT: "https://acct-1234.r2.cloudflarestorage.com",
  CONTAINER_KNOWN_GOOD_IMAGE: `registry.cloudflare.com/acct-1234/opendocs@sha256:${KNOWN_GOOD_DIGEST}`,
};

function renderedConfig(overrides: Record<string, unknown> = {}) {
  const rendered = renderProductionWranglerConfig({
    templateSource,
    vars,
    ...overrides,
  });
  return {
    rendered,
    config: JSON.parse(rendered.source) as {
      account_id: string;
      routes: { pattern: string; custom_domain: boolean }[];
      containers: {
        image: string;
        image_build_context?: string;
        image_vars: Record<string, string>;
        class_name: string;
      }[];
      vars: Record<string, string>;
    },
  };
}

describe("wrangler template parsing", () => {
  it("parses the committed JSONC template", () => {
    const config = parseJsonc(templateSource) as {
      name: string;
      main: string;
      containers: unknown[];
    };
    expect(config.name).toBe("opendocs");
    expect(config.main).toBe("worker/index.ts");
    expect(config.containers).toHaveLength(1);
  });

  it("exports the Durable Object class referenced by the template", () => {
    const config = parseJsonc(templateSource) as {
      containers: { class_name: string }[];
      vars: Record<string, string>;
    };
    const className = config.containers[0]?.class_name;
    expect(className).toBeTruthy();
    expect(workerSource).toContain(`export class ${className}`);
    expect(config.vars.AWS_REGION).toBe("us-east-1");
    expect(config.vars.CONTAINER_SINGLETON_NAME).toBe("opendocs-production-v3");
  });

  it("does not treat comment markers inside strings as comments", () => {
    const config = parseJsonc(
      '{ "endpoint": "https://acct.r2.example.com", /* c */ "note": "a // b", }',
    ) as { endpoint: string; note: string };
    expect(config.endpoint).toBe("https://acct.r2.example.com");
    expect(config.note).toBe("a // b");
  });
});

describe("known-good image validation", () => {
  it("accepts a sha256 digest reference", () => {
    const image = `registry.cloudflare.com/acct/opendocs@sha256:${KNOWN_GOOD_DIGEST}`;
    expect(parseContainerImageRef(image)).toBe(image);
  });

  it("accepts an explicit tag reference", () => {
    expect(
      parseContainerImageRef("registry.cloudflare.com/acct/opendocs:v9"),
    ).toBe("registry.cloudflare.com/acct/opendocs:v9");
  });

  it("rejects a floating reference without tag or digest", () => {
    expect(() =>
      parseContainerImageRef("registry.cloudflare.com/acct/opendocs"),
    ).toThrow(/explicit :tag or @sha256 digest/);
  });

  it("rejects an empty tag", () => {
    expect(() =>
      parseContainerImageRef("registry.cloudflare.com/acct/opendocs:"),
    ).toThrow(/explicit :tag or @sha256 digest/);
  });

  it("rejects a truncated digest", () => {
    expect(() =>
      parseContainerImageRef(
        "registry.cloudflare.com/acct/opendocs@sha256:1ebd786f",
      ),
    ).toThrow(/64 lowercase hex/);
  });

  it("rejects a protocol prefix wrangler would refuse", () => {
    expect(() =>
      parseContainerImageRef(
        `https://registry.cloudflare.com/acct/opendocs@sha256:${KNOWN_GOOD_DIGEST}`,
      ),
    ).toThrow(/protocol/);
  });

  it("rejects an unset variable", () => {
    expect(() => parseContainerImageRef("  ")).toThrow(
      /CONTAINER_KNOWN_GOOD_IMAGE is required/,
    );
  });
});

describe("public app URL validation", () => {
  it("returns the origin and route host", () => {
    expect(parsePublicAppUrl("https://opendocs.namuh.co/")).toEqual({
      appUrl: "https://opendocs.namuh.co",
      host: "opendocs.namuh.co",
    });
  });

  it("rejects plaintext http", () => {
    expect(() => parsePublicAppUrl("http://opendocs.namuh.co")).toThrow(
      /https/,
    );
  });

  it("rejects a non-URL value", () => {
    expect(() => parsePublicAppUrl("opendocs.namuh.co")).toThrow(/valid URL/);
  });
});

describe("required repository variables", () => {
  it("reports every missing variable at once", () => {
    expect(missingDeployVariables({})).toEqual([...REQUIRED_DEPLOY_VARIABLES]);
  });

  it("treats blank values as missing", () => {
    expect(
      missingDeployVariables({ ...vars, CONTAINER_KNOWN_GOOD_IMAGE: "   " }),
    ).toEqual(["CONTAINER_KNOWN_GOOD_IMAGE"]);
  });

  it("blocks rendering before any deploy when the known-good image is unset", () => {
    expect(() =>
      renderProductionWranglerConfig({
        templateSource,
        vars: { ...vars, CONTAINER_KNOWN_GOOD_IMAGE: undefined },
      }),
    ).toThrow(/CONTAINER_KNOWN_GOOD_IMAGE/);
  });
});

describe("safe SEO mode preservation", () => {
  it("defaults to enabled when the variable is unset", () => {
    expect(resolveSafeRootRobots(undefined)).toBe("true");
  });

  it("allows an explicit opt-out for normal deploys", () => {
    expect(resolveSafeRootRobots("false")).toBe("false");
  });

  it("forces safe mode on during rollback even when opted out", () => {
    expect(resolveSafeRootRobots("false", "rollback")).toBe("true");
  });

  it("keeps SAFE_ROOT_ROBOTS in the rollback worker vars", () => {
    const { config } = renderedConfig({
      vars: { ...vars, SAFE_ROOT_ROBOTS: "false" },
      mode: "rollback",
    });
    expect(config.vars.SAFE_ROOT_ROBOTS).toBe("true");
  });
});

describe("rendered production config", () => {
  it("injects account, route, bucket and endpoint from repository variables", () => {
    const { config } = renderedConfig();
    expect(config.account_id).toBe("acct-1234");
    expect(config.routes).toEqual([
      { pattern: "opendocs.example.net", custom_domain: true },
    ]);
    expect(config.vars.S3_BUCKET).toBe("prod-doc-assets");
    expect(config.vars.S3_ENDPOINT).toBe(
      "https://acct-1234.r2.cloudflarestorage.com",
    );
  });

  it("rewrites every placeholder app URL in build and worker vars", () => {
    const { rendered, config } = renderedConfig();
    expect(rendered.source).not.toContain("docs.example.com");
    expect(config.containers[0].image_vars.NEXT_PUBLIC_APP_URL).toBe(
      "https://opendocs.example.net",
    );
    expect(config.containers[0].image_vars.BETTER_AUTH_URL).toBe(
      "https://opendocs.example.net",
    );
    expect(config.vars.BETTER_AUTH_URL).toBe("https://opendocs.example.net");
  });

  it("pins the known-good image and drops the build context by default", () => {
    const { rendered, config } = renderedConfig();
    expect(rendered.mode).toBe("known-good");
    expect(config.containers[0].image).toBe(vars.CONTAINER_KNOWN_GOOD_IMAGE);
    expect(config.containers[0].image_build_context).toBeUndefined();
  });

  it("keeps the Dockerfile build for an explicit build deploy", () => {
    const { config } = renderedConfig({ mode: "build" });
    expect(config.containers[0].image).toBe("./Dockerfile");
    expect(config.containers[0].image_build_context).toBe(".");
  });

  it("targets the health endpoint on the public app URL", () => {
    expect(renderedConfig().rendered.healthUrl).toBe(
      "https://opendocs.example.net/api/health",
    );
  });

  it("never writes secret material into the generated config", () => {
    const { rendered } = renderedConfig();
    for (const secret of [
      "CLOUDFLARE_API_TOKEN",
      "DATABASE_URL",
      "BETTER_AUTH_SECRET",
      "STRIPE_SECRET_KEY",
      "S3_SECRET_ACCESS_KEY",
    ]) {
      expect(rendered.source).not.toContain(secret);
    }
  });

  it("fails closed when the template still holds an unreplaced placeholder", () => {
    expect(() =>
      renderProductionWranglerConfig({
        templateSource: templateSource.replace(
          '"S3_BUCKET": "your-doc-assets-bucket"',
          '"S3_BUCKET_LEGACY": "your-doc-assets-bucket"',
        ),
        vars,
      }),
    ).toThrow(/template placeholders/);
  });
});

describe("health payload evaluation", () => {
  it("accepts an ok health body", () => {
    expect(
      evaluateHealthPayload(200, JSON.stringify({ status: "ok" })).healthy,
    ).toBe(true);
  });

  it("rejects a degraded body served with 200", () => {
    const result = evaluateHealthPayload(
      200,
      JSON.stringify({ status: "degraded" }),
    );
    expect(result.healthy).toBe(false);
    expect(result.reason).toBe("health status degraded");
  });

  it("rejects a non-200 response", () => {
    expect(evaluateHealthPayload(502, "Bad Gateway")).toEqual({
      healthy: false,
      status: 502,
      reason: "http 502",
    });
  });

  it("rejects an HTML error page served with 200", () => {
    expect(evaluateHealthPayload(200, "<html>error</html>").reason).toBe(
      "response body is not JSON",
    );
  });

  it("rejects a JSON body without a status field", () => {
    expect(
      evaluateHealthPayload(200, JSON.stringify({ ok: true })).reason,
    ).toBe("health status missing");
  });

  it("builds the health URL without a duplicate slash", () => {
    expect(healthUrl("https://opendocs.namuh.co/")).toBe(
      "https://opendocs.namuh.co/api/health",
    );
  });
});

describe("bounded health polling", () => {
  const okResponse = {
    status: 200,
    text: () => Promise.resolve(JSON.stringify({ status: "ok" })),
  };
  const downResponse = {
    status: 522,
    text: () => Promise.resolve("connection timed out"),
  };

  it("accepts only after consecutive healthy probes", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(downResponse)
      .mockResolvedValueOnce(okResponse)
      .mockResolvedValueOnce(okResponse);
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await pollHealth({
      url: "https://opendocs.example.net/api/health",
      attempts: 5,
      intervalMs: 1000,
      requiredSuccesses: 2,
      fetchImpl,
      sleep,
    });

    expect(result).toEqual({ healthy: true, attempts: 3, reason: "ok" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("does not accept a lone healthy probe during a gradual rollout", async () => {
    // A single probe can land on an instance still running the previous image.
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(okResponse)
      .mockResolvedValueOnce(downResponse)
      .mockResolvedValueOnce(okResponse);

    const result = await pollHealth({
      url: "https://opendocs.example.net/api/health",
      attempts: 3,
      intervalMs: 1000,
      requiredSuccesses: 3,
      fetchImpl,
      sleep: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.healthy).toBe(false);
    expect(result.reason).toMatch(/only 1\/3 consecutive healthy probes/);
  });

  it("defaults to requiring multiple consecutive successes", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse);

    const result = await pollHealth({
      url: "https://opendocs.example.net/api/health",
      attempts: 10,
      intervalMs: 1000,
      fetchImpl,
      sleep: vi.fn().mockResolvedValue(undefined),
    });

    expect(HEALTH_POLL_BOUNDS.requiredSuccesses).toBeGreaterThan(1);
    expect(result.healthy).toBe(true);
    expect(result.attempts).toBe(HEALTH_POLL_BOUNDS.requiredSuccesses);
  });

  it("never requires more successes than the attempt budget allows", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse);

    const result = await pollHealth({
      url: "https://opendocs.example.net/api/health",
      attempts: 1,
      intervalMs: 1000,
      requiredSuccesses: 99,
      fetchImpl,
      sleep: vi.fn().mockResolvedValue(undefined),
    });

    expect(result).toEqual({ healthy: true, attempts: 1, reason: "ok" });
  });

  it("gives up after the attempt budget instead of waiting forever", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(downResponse);
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await pollHealth({
      url: "https://opendocs.example.net/api/health",
      attempts: 3,
      intervalMs: 1000,
      requiredSuccesses: 1,
      fetchImpl,
      sleep,
    });

    expect(result.healthy).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.reason).toBe("http 522");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    // No trailing sleep after the final attempt.
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("treats a network error as an unhealthy attempt and keeps polling", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValueOnce(okResponse);

    const result = await pollHealth({
      url: "https://opendocs.example.net/api/health",
      attempts: 2,
      intervalMs: 1000,
      requiredSuccesses: 1,
      fetchImpl,
      sleep: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.healthy).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it("clamps the attempt and interval budget", () => {
    expect(clampAttempts(0)).toBe(HEALTH_POLL_BOUNDS.minAttempts);
    expect(clampAttempts(500)).toBe(HEALTH_POLL_BOUNDS.maxAttempts);
    expect(clampAttempts(undefined)).toBe(HEALTH_POLL_BOUNDS.defaultAttempts);
    expect(clampAttempts(Number.NaN)).toBe(HEALTH_POLL_BOUNDS.defaultAttempts);
    expect(clampIntervalMs(1)).toBe(HEALTH_POLL_BOUNDS.minIntervalMs);
    expect(clampIntervalMs(10 ** 9)).toBe(HEALTH_POLL_BOUNDS.maxIntervalMs);
    expect(clampIntervalMs(undefined)).toBe(
      HEALTH_POLL_BOUNDS.defaultIntervalMs,
    );
  });

  it("bounds the worst-case wait below the workflow timeout", () => {
    const worstCaseMinutes =
      (HEALTH_POLL_BOUNDS.maxAttempts * HEALTH_POLL_BOUNDS.maxIntervalMs) /
      60000;
    expect(worstCaseMinutes).toBeLessThanOrEqual(45);
  });
});

describe("workflow status after a rollback", () => {
  it("succeeds only when the requested deploy is healthy", () => {
    expect(
      summarizeGateOutcome({ deployHealthy: true, rolledBack: false }),
    ).toEqual({ exitCode: 0, message: "Deployment healthy." });
  });

  it("fails when the deploy is unhealthy and no rollback ran", () => {
    const summary = summarizeGateOutcome({
      deployHealthy: false,
      rolledBack: false,
    });
    expect(summary.exitCode).toBe(1);
    expect(summary.message).toMatch(/no rollback ran/);
  });

  it("still fails after a successful rollback", () => {
    const summary = summarizeGateOutcome({
      deployHealthy: false,
      rolledBack: true,
      rollbackHealthy: true,
    });
    expect(summary.exitCode).toBe(1);
    expect(summary.message).toMatch(/rolled back/);
    expect(summary.message).toMatch(/healthy again/);
  });

  it("fails loudly when the rollback is also unhealthy", () => {
    const summary = summarizeGateOutcome({
      deployHealthy: false,
      rolledBack: true,
      rollbackHealthy: false,
    });
    expect(summary.exitCode).toBe(1);
    expect(summary.message).toMatch(/manual intervention/);
  });
});

describe("deploy gate orchestration", () => {
  function gateHarness(healthResults: boolean[]) {
    const queued = [...healthResults];
    const writes: string[] = [];
    const deploys: { mode: string; image: string }[] = [];
    return {
      writes,
      deploys,
      writeConfig: (source: string) => writes.push(source),
      deploy: (context: { mode: string; image: string }) => {
        deploys.push(context);
      },
      checkHealth: () =>
        Promise.resolve({
          healthy: queued.shift() ?? false,
          attempts: 1,
          reason: "test",
        }),
    };
  }

  it("does not roll back when a build deploy is healthy", async () => {
    const harness = gateHarness([true]);
    const result = await runDeployGate({
      templateSource,
      vars,
      mode: "build",
      ...harness,
    });

    expect(result.exitCode).toBe(0);
    expect(result.rolledBack).toBe(false);
    expect(harness.deploys).toEqual([{ mode: "build", image: "./Dockerfile" }]);
  });

  it("rolls back to the known-good image and still fails the run", async () => {
    const harness = gateHarness([false, true]);
    const result = await runDeployGate({
      templateSource,
      vars,
      mode: "build",
      ...harness,
    });

    expect(result.exitCode).toBe(1);
    expect(result.rolledBack).toBe(true);
    expect(result.rollbackHealthy).toBe(true);
    expect(result.rollbackImage).toBe(vars.CONTAINER_KNOWN_GOOD_IMAGE);
    expect(harness.deploys).toEqual([
      { mode: "build", image: "./Dockerfile" },
      { mode: "rollback", image: vars.CONTAINER_KNOWN_GOOD_IMAGE },
    ]);
  });

  it("keeps safe SEO mode on in the rollback config it deploys", async () => {
    const harness = gateHarness([false, true]);
    await runDeployGate({
      templateSource,
      vars: { ...vars, SAFE_ROOT_ROBOTS: "false" },
      mode: "build",
      ...harness,
    });

    const rollbackConfig = JSON.parse(
      harness.writes[harness.writes.length - 1],
    ) as { vars: Record<string, string>; containers: { image: string }[] };
    expect(rollbackConfig.vars.SAFE_ROOT_ROBOTS).toBe("true");
    expect(rollbackConfig.containers[0].image).toBe(
      vars.CONTAINER_KNOWN_GOOD_IMAGE,
    );
  });

  it("reports manual intervention when the rollback is also unhealthy", async () => {
    const harness = gateHarness([false, false]);
    const result = await runDeployGate({
      templateSource,
      vars,
      mode: "build",
      ...harness,
    });

    expect(result.exitCode).toBe(1);
    expect(result.rollbackHealthy).toBe(false);
    expect(result.message).toMatch(/manual intervention/);
  });

  it("does not redeploy the same image it just failed on", async () => {
    const harness = gateHarness([false]);
    const result = await runDeployGate({
      templateSource,
      vars,
      mode: "known-good",
      ...harness,
    });

    expect(result.exitCode).toBe(1);
    expect(result.rolledBack).toBe(false);
    expect(harness.deploys).toHaveLength(1);
  });

  it("aborts before deploying when a required variable is missing", async () => {
    const harness = gateHarness([true]);
    await expect(
      runDeployGate({
        templateSource,
        vars: { ...vars, PUBLIC_APP_URL: "" },
        mode: "build",
        ...harness,
      }),
    ).rejects.toThrow(/PUBLIC_APP_URL/);
    expect(harness.deploys).toHaveLength(0);
    expect(harness.writes).toHaveLength(0);
  });
});

describe("gate CLI arguments", () => {
  it("defaults to the pinned known-good image", () => {
    expect(parseCliArgs([])).toEqual({ mode: "known-good", dryRun: false });
  });

  it("accepts an explicit build deploy", () => {
    expect(parseCliArgs(["--mode", "build"])).toEqual({
      mode: "build",
      dryRun: false,
    });
    expect(parseCliArgs(["--mode=build", "--dry-run"])).toEqual({
      mode: "build",
      dryRun: true,
    });
  });

  it("refuses an unknown mode instead of guessing", () => {
    expect(() => parseCliArgs(["--mode", "rollback"])).toThrow(/--mode/);
    expect(() => parseCliArgs(["--yolo"])).toThrow(/Unknown argument/);
  });
});

describe("deploy workflow wiring", () => {
  it("runs the health gate instead of a bare wrangler deploy", () => {
    expect(workflowSource).toContain("scripts/deploy-health-gate.mjs");
    expect(workflowSource).not.toMatch(/run: npx wrangler deploy\s*$/m);
  });

  it("passes every required repository variable into the gate", () => {
    for (const name of REQUIRED_DEPLOY_VARIABLES) {
      expect(workflowSource).toContain(`${name}: \${{ vars.${name} }}`);
    }
  });

  it("passes the Cloudflare API token as a secret, never a variable", () => {
    expect(workflowSource).toContain(
      `CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}`,
    );
    expect(workflowSource).not.toContain("vars.CLOUDFLARE_API_TOKEN");
  });

  it("bounds the job so a hung container cannot run the job forever", () => {
    expect(workflowSource).toMatch(/timeout-minutes: \d+/);
  });

  it("keeps read-only repository permissions", () => {
    expect(workflowSource).toContain("contents: read");
  });

  it("passes the health poll budget into the gate", () => {
    for (const name of [
      "HEALTH_CHECK_ATTEMPTS",
      "HEALTH_CHECK_INTERVAL_MS",
      "HEALTH_CHECK_REQUIRED_SUCCESSES",
    ]) {
      expect(workflowSource).toContain(`${name}: \${{ inputs.`);
    }
  });

  it("validates configuration in a dry run before deploying", () => {
    const dryRunIndex = workflowSource.indexOf("--dry-run");
    const realDeployIndex = workflowSource.indexOf(
      "name: Deploy with health gate and automatic rollback",
    );
    expect(dryRunIndex).toBeGreaterThan(-1);
    expect(realDeployIndex).toBeGreaterThan(dryRunIndex);
    // Only the validation step may be a dry run.
    expect(workflowSource.indexOf("--dry-run", dryRunIndex + 1)).toBe(-1);
  });

  it("serializes production deploys so a queued run cannot race a rollback", () => {
    expect(workflowSource).toContain("group: deploy-production");
    expect(workflowSource).toContain("cancel-in-progress: false");
  });

  it("removes the generated production config even when the gate fails", () => {
    expect(workflowSource).toMatch(
      /if: always\(\)\s+run: rm -f wrangler\.jsonc/,
    );
  });
});
