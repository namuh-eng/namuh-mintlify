import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { githubConnections, orgMemberships, projects } from "@/lib/db/schema";
import { parseGitHubUrl } from "@/lib/git-settings";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { GitHubAppSettingsClient } from "./github-app-client";

export default async function GitHubAppSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const membership = await db
    .select({ orgId: orgMemberships.orgId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (membership.length === 0) redirect("/");

  const orgId = membership[0].orgId;

  const [connections, orgProjects] = await Promise.all([
    db.select().from(githubConnections).where(eq(githubConnections.orgId, orgId)),
    db
      .select({ repoUrl: projects.repoUrl })
      .from(projects)
      .where(eq(projects.orgId, orgId)),
  ]);

  const selectedRepoFullName =
    orgProjects
      .map((project) => project.repoUrl)
      .find((repoUrl): repoUrl is string => Boolean(parseGitHubUrl(repoUrl ?? "")))
      ?.trim()
      ? (() => {
          const parsed = parseGitHubUrl(
            orgProjects.find((project) => parseGitHubUrl(project.repoUrl ?? ""))
              ?.repoUrl ?? "",
          );
          return parsed ? `${parsed.owner}/${parsed.repo}` : null;
        })()
      : null;

  return (
    <GitHubAppSettingsClient
      initialConnections={connections.map((c) => ({
        id: c.id,
        installationId: c.installationId,
        repos: (c.repos ?? []) as Array<{
          fullName: string;
          branch: string;
          permissions: string;
        }>,
        autoUpdateEnabled: c.autoUpdateEnabled,
        createdAt: c.createdAt.toISOString(),
      }))}
      isAdmin={
        membership[0].role === "admin" || membership[0].role === "editor"
      }
      selectedRepoFullName={selectedRepoFullName}
    />
  );
}
