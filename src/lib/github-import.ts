import { githubConnections, orgMemberships, projects } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { parseGitHubUrl } from "@/lib/git-settings";

export type GitHubImportAccessStatus =
  | "no_repo"
  | "public"
  | "private_auth_required"
  | "private_connected"
  | "invalid_repo";

export interface GitHubImportAccessResult {
  status: GitHubImportAccessStatus;
  owner?: string;
  repo?: string;
  repoFullName?: string;
  message?: string;
}

export function getGitHubImportAccessMessage(
  result: GitHubImportAccessResult,
): string | null {
  switch (result.status) {
    case "no_repo":
      return null;
    case "public":
      return null;
    case "private_connected":
      return null;
    case "invalid_repo":
      return "Repository URL must be a GitHub repository";
    case "private_auth_required":
      return "Connect GitHub before importing docs from a private repository";
    default:
      return "GitHub connection required";
  }
}

export function isLikelyPublicGitHubRepo(repoUrl: string): boolean {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    return false;
  }

  const normalized = repoUrl.toLowerCase();
  return !(normalized.includes("/private") || normalized.includes("?private=") || normalized.includes("#private"));
}

export async function resolveGitHubImportAccessForRepoUrl(params: {
  orgId: string;
  repoUrl?: string | null;
}): Promise<GitHubImportAccessResult> {
  const repoUrl = params.repoUrl?.trim();

  if (!repoUrl) {
    return { status: "no_repo" };
  }

  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    return {
      status: "invalid_repo",
      message: "Repository URL must be a GitHub repository",
    };
  }

  const repoFullName = `${parsed.owner}/${parsed.repo}`.toLowerCase();

  const connections = await db
    .select({ repos: githubConnections.repos })
    .from(githubConnections)
    .where(eq(githubConnections.orgId, params.orgId));

  const hasConnectedRepo = connections.some((connection) =>
    (connection.repos ?? []).some(
      (repo) => repo.fullName.toLowerCase() === repoFullName,
    ),
  );

  if (hasConnectedRepo) {
    return {
      status: "private_connected",
      owner: parsed.owner,
      repo: parsed.repo,
      repoFullName,
    };
  }

  if (isLikelyPublicGitHubRepo(repoUrl)) {
    return {
      status: "public",
      owner: parsed.owner,
      repo: parsed.repo,
      repoFullName,
    };
  }

  return {
    status: "private_auth_required",
    owner: parsed.owner,
    repo: parsed.repo,
    repoFullName,
    message: "Connect GitHub before importing docs from a private repository",
  };
}

export async function resolveGitHubImportAccessForProject(params: {
  projectId: string;
  userId: string;
}): Promise<GitHubImportAccessResult> {
  const rows = await db
    .select({
      repoUrl: projects.repoUrl,
      orgId: projects.orgId,
    })
    .from(projects)
    .innerJoin(orgMemberships, eq(orgMemberships.orgId, projects.orgId))
    .where(
      and(eq(projects.id, params.projectId), eq(orgMemberships.userId, params.userId)),
    )
    .limit(1);

  if (rows.length === 0) {
    return {
      status: "private_auth_required",
      message: "GitHub connection required",
    };
  }

  return resolveGitHubImportAccessForRepoUrl({
    orgId: rows[0].orgId,
    repoUrl: rows[0].repoUrl,
  });
}
