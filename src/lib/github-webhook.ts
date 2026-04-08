/**
 * GitHub webhook auto-deploy — utilities for webhook validation,
 * connection management, and deployment triggering.
 */

import crypto from "node:crypto";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GitHubConnection {
  id: string;
  orgId: string;
  installationId: string;
  repos: GitHubRepo[];
  autoUpdateEnabled: boolean;
  createdAt: Date;
}

export interface GitHubRepo {
  fullName: string;
  branch: string;
  permissions: "read" | "write" | "admin";
}

export interface WebhookPushPayload {
  ref: string;
  after: string;
  repository: {
    full_name: string;
  };
  head_commit?: {
    message: string;
    id: string;
  };
  installation?: {
    id: number;
  };
}

export interface WebhookInstallPayload {
  action: "created" | "deleted" | "suspend" | "unsuspend";
  installation: {
    id: number;
    account: {
      login: string;
    };
  };
  repositories?: Array<{
    full_name: string;
    private: boolean;
  }>;
}

// ── Validation ─────────────────────────────────────────────────────────────────

/** Verify GitHub webhook signature (HMAC-SHA256). */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;
  if (!secret) return false;
  if (!payload) return false;

  const expected = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

/** Extract branch name from a git ref (e.g., "refs/heads/main" → "main"). */
export function extractBranchFromRef(ref: string): string | null {
  const match = ref.match(/^refs\/heads\/(.+)$/);
  return match ? match[1] : null;
}

/** Validate a webhook push payload has required fields. */
export function isValidPushPayload(
  payload: unknown,
): payload is WebhookPushPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  if (typeof p.ref !== "string") return false;
  if (typeof p.after !== "string") return false;
  if (!p.repository || typeof p.repository !== "object") return false;
  const repo = p.repository as Record<string, unknown>;
  if (typeof repo.full_name !== "string") return false;
  return true;
}

/** Validate a webhook installation payload. */
export function isValidInstallPayload(
  payload: unknown,
): payload is WebhookInstallPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  if (typeof p.action !== "string") return false;
  if (!p.installation || typeof p.installation !== "object") return false;
  const inst = p.installation as Record<string, unknown>;
  if (typeof inst.id !== "number") return false;
  return true;
}

/** Validate installation ID (positive integer). */
export function isValidInstallationId(id: unknown): boolean {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

/** Validate a GitHub repo full_name (e.g., "owner/repo"). */
export function isValidRepoFullName(name: string): boolean {
  return /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(name);
}

/** Validate a branch name. */
export function isValidBranchName(name: string): boolean {
  if (!name || name.length > 256) return false;
  if (name.startsWith(".") || name.endsWith(".")) return false;
  if (name.includes("..") || name.includes(" ")) return false;
  return /^[a-zA-Z0-9/_.-]+$/.test(name);
}

// ── Connection helpers ─────────────────────────────────────────────────────────

/** Check if a push event matches a connected repo and branch. */
export function matchesPushTarget(
  repos: GitHubRepo[],
  repoFullName: string,
  branch: string,
): GitHubRepo | null {
  return (
    repos.find(
      (r) =>
        r.fullName.toLowerCase() === repoFullName.toLowerCase() &&
        r.branch.toLowerCase() === branch.toLowerCase(),
    ) ?? null
  );
}

/** Format a connection status. */
export function connectionStatus(
  connection: Pick<GitHubConnection, "autoUpdateEnabled" | "repos">,
): "active" | "inactive" | "no_repos" {
  if (connection.repos.length === 0) return "no_repos";
  return connection.autoUpdateEnabled ? "active" : "inactive";
}

/** Build a short commit description for the deployment. */
export function buildDeployMessage(
  payload: WebhookPushPayload,
  branch: string,
): string {
  const msg = payload.head_commit?.message ?? "Push event";
  const firstLine = msg.split("\n")[0].slice(0, 100);
  return `Auto-deploy from ${payload.repository.full_name}@${branch}: ${firstLine}`;
}

/** Validate the create-connection request body. */
export function validateCreateConnectionRequest(body: unknown): {
  valid: boolean;
  error?: string;
  installationId?: string;
  repos?: GitHubRepo[];
  autoUpdateEnabled?: boolean;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }

  const raw = body as Record<string, unknown>;

  if (!raw.installationId || typeof raw.installationId !== "string") {
    return {
      valid: false,
      error: "installationId is required and must be a string",
    };
  }

  if (raw.repos !== undefined) {
    if (!Array.isArray(raw.repos)) {
      return { valid: false, error: "repos must be an array" };
    }
    for (const repo of raw.repos) {
      if (!repo || typeof repo !== "object") {
        return { valid: false, error: "Each repo must be an object" };
      }
      const r = repo as Record<string, unknown>;
      if (typeof r.fullName !== "string" || !isValidRepoFullName(r.fullName)) {
        return {
          valid: false,
          error: `Invalid repo name: ${String(r.fullName)}`,
        };
      }
      if (typeof r.branch !== "string" || !isValidBranchName(r.branch)) {
        return {
          valid: false,
          error: `Invalid branch name: ${String(r.branch)}`,
        };
      }
    }
  }

  const repos: GitHubRepo[] = Array.isArray(raw.repos)
    ? (raw.repos as GitHubRepo[]).map((r) => ({
        fullName: r.fullName,
        branch: r.branch,
        permissions: r.permissions ?? "read",
      }))
    : [];

  return {
    valid: true,
    installationId: raw.installationId as string,
    repos,
    autoUpdateEnabled: raw.autoUpdateEnabled !== false,
  };
}
