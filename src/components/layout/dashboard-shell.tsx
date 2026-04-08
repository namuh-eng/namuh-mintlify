import { getUserOrg } from "@/lib/get-user-org";
import { getServerSession } from "@/lib/session";
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

  const org = await getUserOrg(session.user.id);

  if (!org) {
    redirect("/onboarding");
  }

  return (
    <DashboardLayoutClient
      orgName={org.name}
      orgSlug={org.slug}
      userName={session.user.name ?? undefined}
      userEmail={session.user.email}
      userImage={session.user.image ?? undefined}
    >
      {children}
    </DashboardLayoutClient>
  );
}
