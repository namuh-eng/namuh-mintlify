/**
 * Assistant API helpers — validation, search query building, and response formatting.
 *
 * Used by:
 *   POST /api/v1/assistant/create-message
 *   POST /api/v1/assistant/search
 *   POST /api/v1/assistant/get-page-content
 */

// ── Types ─────────────────────────────────────────────────────────────────────

interface MessageInput {
  id: string;
  role: string;
  content: string;
  parts?: Array<{ type: string; text?: string }>;
}

interface CreateMessageValid {
  valid: true;
  fp: string;
  threadId: string | null;
  messages: MessageInput[];
  retrievalPageSize: number;
  currentPath: string | null;
}

interface ValidationError {
  valid: false;
  error: string;
}

interface SearchValid {
  valid: true;
  query: string;
  pageSize: number;
  scoreThreshold: number | null;
}

interface GetPageContentValid {
  valid: true;
  path: string;
}

interface SearchResultInput {
  path: string;
  title: string;
  description: string | null;
  content: string | null;
}

interface SearchResult {
  content: string;
  path: string;
  metadata: { title: string; description: string | null };
}

interface PageContentResponse {
  path: string;
  content: string;
}

// ── Snippet length for search results ─────────────────────────────────────────

const SNIPPET_MAX_LENGTH = 500;

// ── Validation: create-message ────────────────────────────────────────────────

export function validateCreateMessageRequest(
  body: unknown,
): CreateMessageValid | ValidationError {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.fp !== "string" || !b.fp.trim()) {
    return { valid: false, error: "fp (fingerprint) is required" };
  }

  if (!Array.isArray(b.messages)) {
    return { valid: false, error: "messages must be an array" };
  }

  if (b.messages.length === 0) {
    return { valid: false, error: "messages must not be empty" };
  }

  const fp = b.fp.trim();
  const threadId =
    typeof b.threadId === "string" ? b.threadId.trim() || null : null;

  let retrievalPageSize = 5;
  if (typeof b.retrievalPageSize === "number" && b.retrievalPageSize > 0) {
    retrievalPageSize = Math.min(
      Math.max(Math.round(b.retrievalPageSize), 1),
      20,
    );
  }

  const currentPath =
    typeof b.currentPath === "string"
      ? b.currentPath.trim().slice(0, 200) || null
      : null;

  return {
    valid: true,
    fp,
    threadId,
    messages: b.messages as MessageInput[],
    retrievalPageSize,
    currentPath,
  };
}

// ── Validation: search ────────────────────────────────────────────────────────

export function validateSearchRequest(
  body: unknown,
): SearchValid | ValidationError {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.query !== "string" || !b.query.trim()) {
    return { valid: false, error: "query is required" };
  }

  let pageSize = 10;
  if (typeof b.pageSize === "number" && b.pageSize > 0) {
    pageSize = Math.min(Math.max(Math.round(b.pageSize), 1), 50);
  }

  const scoreThreshold =
    typeof b.scoreThreshold === "number" &&
    b.scoreThreshold >= 0 &&
    b.scoreThreshold <= 1
      ? b.scoreThreshold
      : null;

  return {
    valid: true,
    query: b.query.trim(),
    pageSize,
    scoreThreshold,
  };
}

// ── Validation: get-page-content ──────────────────────────────────────────────

export function validateGetPageContentRequest(
  body: unknown,
): GetPageContentValid | ValidationError {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.path !== "string" || !b.path.trim()) {
    return { valid: false, error: "path is required" };
  }

  // Normalize: strip leading/trailing slashes, collapse doubles
  const path = b.path
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "/");

  if (!path) {
    return { valid: false, error: "path is required" };
  }

  return { valid: true, path };
}

// ── Search helpers ────────────────────────────────────────────────────────────

/**
 * Build a search pattern for ILIKE matching.
 * Escapes SQL wildcards and wraps with % for substring matching.
 */
export function buildSearchQuery(input: string): string {
  const escaped = input
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  return `%${escaped}%`;
}

/**
 * Format a page row into a search result with a content snippet.
 */
export function formatSearchResult(page: SearchResultInput): SearchResult {
  let snippet = page.content ?? "";
  if (snippet.length > SNIPPET_MAX_LENGTH) {
    snippet = `${snippet.slice(0, SNIPPET_MAX_LENGTH)}...`;
  }

  return {
    content: snippet,
    path: page.path,
    metadata: {
      title: page.title,
      description: page.description,
    },
  };
}

/**
 * Format a page for the get-page-content response.
 */
export function formatPageContentResponse(page: {
  path: string;
  content: string;
}): PageContentResponse {
  return {
    path: page.path,
    content: page.content,
  };
}
