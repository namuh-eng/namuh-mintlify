import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell>
      <div className="flex min-h-0 flex-1">
        <SettingsSidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </DashboardShell>
  );
}
