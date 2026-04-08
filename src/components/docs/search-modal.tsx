"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface SearchablePage {
  path: string;
  title: string;
}

/** Returns true if the shortcut should open the search modal */
export function handleSearchShortcut(event: KeyboardEvent): boolean {
  if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
    return true;
  }
  return false;
}

/** Filter pages by search query (case-insensitive, matches title or path) */
export function filterPages(
  pages: SearchablePage[],
  query: string,
): SearchablePage[] {
  if (!query.trim()) return pages;
  const q = query.toLowerCase();
  return pages.filter(
    (p) =>
      p.title.toLowerCase().includes(q) || p.path.toLowerCase().includes(q),
  );
}

interface SearchModalProps {
  pages: SearchablePage[];
  subdomain: string;
}

export function SearchModal({ pages, subdomain }: SearchModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (handleSearchShortcut(e)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery("");
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Expose open function on the search button via custom event
  useEffect(() => {
    function handleOpenSearch() {
      open();
    }
    document.addEventListener("open-search", handleOpenSearch);
    return () => document.removeEventListener("open-search", handleOpenSearch);
  }, [open]);

  if (!isOpen) return null;

  const results = filterPages(pages, query);

  return (
    <div
      data-testid="search-modal"
      className="search-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <dialog className="search-modal" open aria-label="Search docs">
        <div className="search-modal-header">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-modal-input"
            placeholder="Search documentation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="search-modal-esc">Esc</kbd>
        </div>
        <div className="search-modal-results">
          {results.length === 0 ? (
            <div className="search-modal-empty">No results found</div>
          ) : (
            results.map((page) => (
              <Link
                key={page.path}
                href={`/docs/${subdomain}/${page.path}`}
                className="search-modal-result"
                onClick={close}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>{page.title}</span>
                <span className="search-modal-result-path">{page.path}</span>
              </Link>
            ))
          )}
        </div>
      </dialog>
    </div>
  );
}
