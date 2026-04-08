"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function TrialBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="flex items-center justify-between px-4 py-2 bg-amber-900/30 border-b border-amber-700/30 text-sm"
      data-testid="trial-banner"
    >
      <p className="text-amber-200">
        <strong className="text-amber-100">
          Your team is on a free trial.
        </strong>{" "}
        Your trial ends on April 19, 2026. You will be switched to the Hobby
        plan after.
      </p>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/settings"
          className="text-amber-200 hover:text-amber-100 font-medium underline underline-offset-2"
        >
          Explore upgrades
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-200 transition-colors"
          aria-label="Dismiss banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
