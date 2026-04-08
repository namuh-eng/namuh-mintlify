"use client";

import { Construction } from "lucide-react";

export function SettingsPlaceholder({
  title,
  breadcrumb,
}: {
  title: string;
  breadcrumb: string;
}) {
  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-1 text-sm text-gray-400">{breadcrumb}</div>
      <h1 className="mb-6 text-xl font-semibold text-white">{title}</h1>
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/[0.12] bg-[#1a1a1a] px-6 py-12 text-center">
        <Construction size={28} className="text-gray-500" />
        <p className="text-sm text-gray-400">
          This settings page is coming soon.
        </p>
      </div>
    </div>
  );
}
