import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mintlify Clone",
  description: "AI-native documentation platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
