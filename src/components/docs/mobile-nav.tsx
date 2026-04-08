"use client";

import type { DocsNavEntry } from "@/lib/mdx-renderer";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { DocsSidebar } from "./docs-sidebar";

export function MobileMenuButton() {
  return (
    <button
      type="button"
      data-testid="mobile-menu-btn"
      className="docs-mobile-menu-btn"
      onClick={() => {
        document.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"));
      }}
      aria-label="Open navigation menu"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <title>Menu</title>
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}

interface MobileSidebarProps {
  nav: DocsNavEntry[];
  activePath: string;
  subdomain: string;
  projectName: string;
}

export function MobileSidebar({
  nav,
  activePath,
  subdomain,
  projectName,
}: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleToggle() {
      setIsOpen((prev) => !prev);
    }
    document.addEventListener("toggle-mobile-sidebar", handleToggle);
    return () =>
      document.removeEventListener("toggle-mobile-sidebar", handleToggle);
  }, []);

  // Close on navigation (activePath change)
  // biome-ignore lint/correctness/useExhaustiveDependencies: activePath change should close sidebar
  useEffect(() => {
    setIsOpen(false);
  }, [activePath]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="mobile-sidebar"
      className="mobile-sidebar-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setIsOpen(false);
      }}
    >
      <div className="mobile-sidebar-panel">
        <div className="mobile-sidebar-header">
          <span className="mobile-sidebar-title">{projectName}</span>
          <button
            type="button"
            className="mobile-sidebar-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <DocsSidebar
          nav={nav}
          activePath={activePath}
          subdomain={subdomain}
          projectName={projectName}
        />
      </div>
    </div>
  );
}
