"use client";

import type { TocEntry } from "@/lib/editor";
import { useEffect, useState } from "react";

interface DocsTocProps {
  entries: TocEntry[];
}

export function DocsToc({ entries }: DocsTocProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (entries.length === 0) return;

    const observer = new IntersectionObserver(
      (observerEntries) => {
        for (const entry of observerEntries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0% -80% 0%" },
    );

    for (const tocEntry of entries) {
      const element = document.getElementById(tocEntry.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <aside className="docs-toc">
      <h4 className="docs-toc-title">On this page</h4>
      <nav>
        {entries.map((entry) => (
          <a
            key={entry.id}
            href={`#${entry.id}`}
            className={`docs-toc-link ${activeId === entry.id ? "active" : ""}`}
            style={{ paddingLeft: `${(entry.level - 1) * 12 + 8}px` }}
          >
            {entry.text}
          </a>
        ))}
      </nav>
    </aside>
  );
}
