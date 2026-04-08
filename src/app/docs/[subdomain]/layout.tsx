import type { ReactNode } from "react";

export const metadata = {
  title: "Documentation",
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
