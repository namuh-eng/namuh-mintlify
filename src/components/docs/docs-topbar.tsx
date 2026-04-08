"use client";

import Link from "next/link";
import { MobileMenuButton } from "./mobile-nav";
import { ThemeToggle } from "./theme-provider";

interface DocsTopbarProps {
  projectName: string;
  subdomain: string;
}

export function DocsTopbar({ projectName, subdomain }: DocsTopbarProps) {
  return (
    <div className="docs-topbar">
      <div className="docs-topbar-left">
        <MobileMenuButton />
        <Link href={`/docs/${subdomain}`} className="docs-topbar-logo">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Logo"
          >
            <title>Logo</title>
            <path d="M12 2L2 7l10 5 10-5-10-5Z" fill="#16A34A" opacity="0.8" />
            <path
              d="M2 17l10 5 10-5"
              stroke="#16A34A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12l10 5 10-5"
              stroke="#16A34A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="docs-topbar-title">{projectName}</span>
        </Link>
      </div>
      <div className="docs-topbar-right">
        <button
          type="button"
          className="docs-search-btn"
          onClick={() => {
            document.dispatchEvent(new CustomEvent("open-search"));
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-label="Search"
          >
            <title>Search</title>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span className="docs-search-text">Search...</span>
          <kbd>&#8984;K</kbd>
        </button>
        <ThemeToggle />
      </div>
    </div>
  );
}
