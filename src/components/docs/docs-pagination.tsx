"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface PageRef {
  path: string;
  title: string;
}

interface DocsPaginationProps {
  prev: PageRef | null;
  next: PageRef | null;
  subdomain: string;
}

export function DocsPagination({ prev, next, subdomain }: DocsPaginationProps) {
  if (!prev && !next) return null;

  return (
    <div className="docs-pagination">
      {prev ? (
        <Link
          href={`/docs/${subdomain}/${prev.path}`}
          className="docs-pagination-link prev"
        >
          <ChevronLeft size={16} />
          <div>
            <span className="docs-pagination-label">Previous</span>
            <span className="docs-pagination-title">{prev.title}</span>
          </div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={`/docs/${subdomain}/${next.path}`}
          className="docs-pagination-link next"
        >
          <div>
            <span className="docs-pagination-label">Next</span>
            <span className="docs-pagination-title">{next.title}</span>
          </div>
          <ChevronRight size={16} />
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
