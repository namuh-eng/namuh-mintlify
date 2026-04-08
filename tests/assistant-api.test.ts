/**
 * Unit tests for the assistant API helper functions.
 *
 * Tests: request validation, search logic, page content retrieval,
 * conversation persistence, and message formatting.
 */

import { describe, expect, it } from "vitest";

import {
  buildSearchQuery,
  formatPageContentResponse,
  formatSearchResult,
  validateCreateMessageRequest,
  validateGetPageContentRequest,
  validateSearchRequest,
} from "@/lib/assistant";

// ── validateCreateMessageRequest ──────────────────────────────────────────────

describe("validateCreateMessageRequest", () => {
  it("accepts a valid request with fp and messages", () => {
    const result = validateCreateMessageRequest({
      fp: "user-123",
      messages: [{ id: "1", role: "user", content: "How do I get started?" }],
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.fp).toBe("user-123");
      expect(result.messages).toHaveLength(1);
    }
  });

  it("rejects when fp is missing", () => {
    const result = validateCreateMessageRequest({
      messages: [{ id: "1", role: "user", content: "hi" }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("fp");
    }
  });

  it("rejects when messages array is empty", () => {
    const result = validateCreateMessageRequest({
      fp: "user-123",
      messages: [],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("messages");
    }
  });

  it("rejects when messages is not an array", () => {
    const result = validateCreateMessageRequest({
      fp: "user-123",
      messages: "not an array",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects when body is null", () => {
    const result = validateCreateMessageRequest(null);
    expect(result.valid).toBe(false);
  });

  it("accepts optional threadId", () => {
    const result = validateCreateMessageRequest({
      fp: "user-123",
      threadId: "thread-abc",
      messages: [{ id: "1", role: "user", content: "hello" }],
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.threadId).toBe("thread-abc");
    }
  });

  it("accepts optional retrievalPageSize", () => {
    const result = validateCreateMessageRequest({
      fp: "anon",
      messages: [{ id: "1", role: "user", content: "help" }],
      retrievalPageSize: 10,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.retrievalPageSize).toBe(10);
    }
  });

  it("clamps retrievalPageSize to valid range", () => {
    const result = validateCreateMessageRequest({
      fp: "anon",
      messages: [{ id: "1", role: "user", content: "help" }],
      retrievalPageSize: 100,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.retrievalPageSize).toBeLessThanOrEqual(20);
    }
  });
});

// ── validateSearchRequest ─────────────────────────────────────────────────────

describe("validateSearchRequest", () => {
  it("accepts a valid query", () => {
    const result = validateSearchRequest({ query: "getting started" });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.query).toBe("getting started");
    }
  });

  it("rejects empty query", () => {
    const result = validateSearchRequest({ query: "" });
    expect(result.valid).toBe(false);
  });

  it("rejects missing query", () => {
    const result = validateSearchRequest({});
    expect(result.valid).toBe(false);
  });

  it("accepts optional pageSize", () => {
    const result = validateSearchRequest({ query: "test", pageSize: 5 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.pageSize).toBe(5);
    }
  });

  it("clamps pageSize to max 50", () => {
    const result = validateSearchRequest({ query: "test", pageSize: 100 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.pageSize).toBeLessThanOrEqual(50);
    }
  });

  it("defaults pageSize to 10", () => {
    const result = validateSearchRequest({ query: "test" });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.pageSize).toBe(10);
    }
  });

  it("rejects null body", () => {
    const result = validateSearchRequest(null);
    expect(result.valid).toBe(false);
  });
});

// ── validateGetPageContentRequest ─────────────────────────────────────────────

describe("validateGetPageContentRequest", () => {
  it("accepts a valid path", () => {
    const result = validateGetPageContentRequest({ path: "getting-started" });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.path).toBe("getting-started");
    }
  });

  it("rejects empty path", () => {
    const result = validateGetPageContentRequest({ path: "" });
    expect(result.valid).toBe(false);
  });

  it("rejects missing path", () => {
    const result = validateGetPageContentRequest({});
    expect(result.valid).toBe(false);
  });

  it("normalizes path (strips leading/trailing slashes)", () => {
    const result = validateGetPageContentRequest({ path: "/docs/intro/" });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.path).toBe("docs/intro");
    }
  });

  it("rejects null body", () => {
    const result = validateGetPageContentRequest(null);
    expect(result.valid).toBe(false);
  });
});

// ── buildSearchQuery ──────────────────────────────────────────────────────────

describe("buildSearchQuery", () => {
  it("builds a case-insensitive search pattern", () => {
    const result = buildSearchQuery("getting started");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("escapes SQL-like special characters", () => {
    const result = buildSearchQuery("100% off");
    expect(result).not.toContain("100%");
    // Should escape the % for ILIKE safety
    expect(result).toContain("\\%");
  });

  it("handles underscores", () => {
    const result = buildSearchQuery("my_function");
    expect(result).toContain("\\_");
  });
});

// ── formatSearchResult ────────────────────────────────────────────────────────

describe("formatSearchResult", () => {
  it("formats a page into a search result", () => {
    const page = {
      path: "guides/quickstart",
      title: "Quickstart Guide",
      description: "Get started fast",
      content: "This is a long content body that should be truncated...",
    };
    const result = formatSearchResult(page);
    expect(result).toHaveProperty("path", "guides/quickstart");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("metadata");
    expect(result.metadata).toHaveProperty("title", "Quickstart Guide");
  });

  it("truncates long content to a snippet", () => {
    const longContent = "word ".repeat(500);
    const result = formatSearchResult({
      path: "test",
      title: "Test",
      description: null,
      content: longContent,
    });
    expect(result.content.length).toBeLessThan(longContent.length);
  });
});

// ── formatPageContentResponse ─────────────────────────────────────────────────

describe("formatPageContentResponse", () => {
  it("formats a page into a content response", () => {
    const result = formatPageContentResponse({
      path: "api/overview",
      content: "# API Overview\n\nWelcome to the API.",
    });
    expect(result).toEqual({
      path: "api/overview",
      content: "# API Overview\n\nWelcome to the API.",
    });
  });
});
