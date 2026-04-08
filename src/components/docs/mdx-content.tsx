"use client";

import { useEffect, useRef } from "react";

interface MdxContentProps {
  html: string;
}

/**
 * Renders pre-compiled MDX HTML and adds client-side interactivity
 * for tabs, code copy buttons, and accordion toggles.
 */
export function MdxContent({ html }: MdxContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: html triggers re-wiring of event listeners when content changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Wire up tab switching
    const tabButtons = container.querySelectorAll<HTMLButtonElement>(
      ".tab-bar .tab-button",
    );
    for (const btn of tabButtons) {
      btn.addEventListener("click", () => {
        const tabIndex = btn.dataset.tab;
        const tabContainer = btn.closest(".tabs, .code-group");
        if (!tabContainer || tabIndex === undefined) return;

        // Deactivate all tabs and panels in this container
        const allButtons =
          tabContainer.querySelectorAll<HTMLButtonElement>(".tab-button");
        const allPanels =
          tabContainer.querySelectorAll<HTMLDivElement>(".tab-panel");

        for (const b of allButtons) b.classList.remove("active");
        for (const p of allPanels) p.classList.remove("active");

        // Activate selected
        btn.classList.add("active");
        const panel = tabContainer.querySelector(
          `.tab-panel[data-tab="${tabIndex}"]`,
        );
        if (panel) panel.classList.add("active");
      });
    }

    // Wire up code copy buttons
    const copyButtons =
      container.querySelectorAll<HTMLButtonElement>(".code-copy");
    for (const btn of copyButtons) {
      btn.addEventListener("click", () => {
        const codeBlock = btn.closest(".code-block");
        const code = codeBlock?.querySelector("code");
        if (code) {
          navigator.clipboard.writeText(code.textContent || "");
          const originalText = btn.textContent;
          btn.textContent = "Copied!";
          setTimeout(() => {
            btn.textContent = originalText;
          }, 2000);
        }
      });
    }
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="docs-content prose"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: MDX content is server-generated from trusted source (DB content authored by project owners)
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
