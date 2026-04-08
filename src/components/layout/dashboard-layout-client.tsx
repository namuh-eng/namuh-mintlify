"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { TrialBanner } from "./trial-banner";

interface ProjectInfo {
  id: string;
  name: string;
  slug: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  orgName: string;
  orgSlug: string;
  userName?: string;
  userEmail?: string;
  userImage?: string;
  projects?: ProjectInfo[];
}

export function DashboardLayoutClient({
  children,
  orgName,
  orgSlug,
  userName,
  userEmail,
  userImage,
  projects = [],
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar
        orgName={orgName}
        orgSlug={orgSlug}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        projects={projects}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <TrialBanner />
        <TopBar
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
