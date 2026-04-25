import { db } from "@/lib/db";
import { githubConnections, orgMemberships, projects } from "@/lib/db/schema";
import { parseGitHubUrl } from "@/lib/git-settings";
import { and, eq } from "drizzle-orm";

export interface ConnectedGitHubRepo {
  fullName: string;
  branch: string;
  permissions: string;
  installationId: string;
}

export type GitHubImportAccessStatus =
  | "no_repo"
  | "public"
  | "repo_not_connected"
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
    case "repo_not_connected":
      return "Connect GitHub and select this repository before importing docs";
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
  return !(
    normalized.includes("/private") ||
    normalized.includes("?private=") ||
    normalized.includes("#private")
  );
}

export async function listConnectedGitHubRepos(
  orgId: string,
): Promise<ConnectedGitHubRepo[]> {
  const connections = await db
    .select({
      installationId: githubConnections.installationId,
      repos: githubConnections.repos,
    })
    .from(githubConnections)
    .where(eq(githubConnections.orgId, orgId));

  return connections.flatMap((connection) =>
    (connection.repos ?? []).map((repo) => ({
      ...repo,
      installationId: connection.installationId,
    })),
  );
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
  const connectedRepos = await listConnectedGitHubRepos(params.orgId);

  const hasConnectedRepo = connectedRepos.some(
    (repo) => repo.fullName.toLowerCase() === repoFullName,
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
    status: "repo_not_connected",
    owner: parsed.owner,
    repo: parsed.repo,
    repoFullName,
    message: "Connect GitHub and select this repository before importing docs",
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
      and(
        eq(projects.id, params.projectId),
        eq(orgMemberships.userId, params.userId),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    return {
      status: "repo_not_connected",
      message: "GitHub connection required",
    };
  }

  return resolveGitHubImportAccessForRepoUrl({
    orgId: rows[0].orgId,
    repoUrl: rows[0].repoUrl,
  });
}
