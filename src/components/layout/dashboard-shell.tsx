import { db } from "@/lib/db";
import { orgMemberships, organizations, projects } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "./dashboard-layout-client";

interface DashboardShellProps {
  children: React.ReactNode;
}

export async function DashboardShell({ children }: DashboardShellProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  // Get org
  const memberships = await db
    .select({
      orgId: orgMemberships.orgId,
      role: orgMemberships.role,
      org: {
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        plan: organizations.plan,
      },
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  const org = memberships[0].org;

  // Get projects for this org
  const orgProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
    })
    .from(projects)
    .where(eq(projects.orgId, org.id))
    .orderBy(projects.createdAt);

  return (
    <DashboardLayoutClient
      orgName={org.name}
      orgSlug={org.slug}
      userName={session.user.name ?? undefined}
      userEmail={session.user.email}
      userImage={session.user.image ?? undefined}
      projects={orgProjects}
    >
      {children}
    </DashboardLayoutClient>
  );
}
