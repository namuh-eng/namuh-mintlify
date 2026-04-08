import { ThemeProvider } from "@/components/docs/theme-provider";
import type { ReactNode } from "react";

export const metadata = {
  title: "Documentation",
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
