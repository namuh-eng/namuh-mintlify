/**
 * Docs site search utilities — full-text search helpers, snippet extraction,
 * result grouping, and highlight logic.
 *
 * Used by:
 *   GET /api/docs/[subdomain]/search
 *   SearchModal component
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchResult {
  path: string;
  title: string;
  description: string | null;
  snippet: string;
  breadcrumb: string[];
}

export interface SearchResultGroup {
  section: string;
  results: SearchResult[];
}

// ── tsquery builder ───────────────────────────────────────────────────────────

/**
 * Convert a user search query into a Postgres-compatible tsquery string.
 * - Splits on whitespace
 * - Joins with & (AND)
 * - Adds :* prefix matching to the last (or only) word for type-ahead
 */
export function buildTsQuery(input: string): string {
  const tokens = input
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)
    // Strip tsquery special chars: & | ! ( ) < > : * \
    .map((t) => t.replace(/[&|!()<>:\\*]/g, "").trim())
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return "";

  // Add prefix matching to the last token for type-ahead behavior
  const last = tokens.length - 1;
  tokens[last] = `${tokens[last]}:*`;

  return tokens.join(" & ");
}

// ── Snippet extraction ────────────────────────────────────────────────────────

const SNIPPET_LENGTH = 160;

/**
 * Strip basic markdown syntax from text for cleaner snippets.
 */
function stripMarkdown(text: string): string {
  return (
    text
      // Headings
      .replace(/^#{1,6}\s+/gm, "")
      // Bold/italic
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      // Inline code
      .replace(/`([^`]+)`/g, "$1")
      // Underscore emphasis
      .replace(/_([^_]+)_/g, "$1")
      // Links [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      // HTML tags
      .replace(/<[^>]+>/g, "")
      // Multiple newlines
      .replace(/\n{2,}/g, " ")
      .replace(/\n/g, " ")
      .trim()
  );
}

/**
 * Extract a text snippet from content centered around the first occurrence
 * of the query. Falls back to the beginning of the content.
 */
export function extractSnippet(
  content: string | null | undefined,
  query: string,
): string {
  if (!content) return "";

  const cleaned = stripMarkdown(content);
  if (!cleaned) return "";

  const lowerCleaned = cleaned.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();

  // Find first occurrence of any query word
  const words = lowerQuery.split(/\s+/).filter(Boolean);
  let matchIdx = -1;
  for (const word of words) {
    const idx = lowerCleaned.indexOf(word);
    if (idx !== -1 && (matchIdx === -1 || idx < matchIdx)) {
      matchIdx = idx;
    }
  }

  if (matchIdx === -1) {
    return cleaned.slice(0, SNIPPET_LENGTH);
  }

  // Center snippet around match
  const start = Math.max(0, matchIdx - 40);
  const end = Math.min(cleaned.length, start + SNIPPET_LENGTH);
  let snippet = cleaned.slice(start, end);

  if (start > 0) snippet = `...${snippet}`;
  if (end < cleaned.length) snippet = `${snippet}...`;

  return snippet;
}

// ── Highlight ─────────────────────────────────────────────────────────────────

/**
 * Highlight matched query words in text with <mark> tags.
 * HTML-escapes the text first to prevent XSS.
 */
export function highlightMatches(text: string, query: string): string {
  if (!query.trim()) return text;

  // Escape HTML first
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (words.length === 0) return escaped;

  const pattern = new RegExp(`(${words.join("|")})`, "gi");
  return escaped.replace(pattern, "<mark>$1</mark>");
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

/**
 * Convert a page path like "getting-started/installation" into
 * breadcrumb parts: ["Getting Started", "Installation"]
 */
export function getBreadcrumb(path: string): string[] {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
    );
}

// ── Result grouping ───────────────────────────────────────────────────────────

/**
 * Group search results by their first breadcrumb segment (section).
 */
export function groupResultsBySection(
  results: SearchResult[],
): SearchResultGroup[] {
  if (results.length === 0) return [];

  const groups = new Map<string, SearchResult[]>();

  for (const r of results) {
    const section = r.breadcrumb[0] || "Other";
    const existing = groups.get(section);
    if (existing) {
      existing.push(r);
    } else {
      groups.set(section, [r]);
    }
  }

  return Array.from(groups.entries()).map(([section, sectionResults]) => ({
    section,
    results: sectionResults,
  }));
}
