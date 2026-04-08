import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
