/**
 * Analytics assistant tab utilities — types, helpers, CSV export formatting.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DailyConversationCount {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface AssistantCategory {
  category: string;
  count: number;
}

export interface ChatHistoryEntry {
  id: string;
  firstMessage: string;
  messageCount: number;
  createdAt: string; // ISO timestamp
}

export interface AssistantAnalyticsData {
  dailyCounts: DailyConversationCount[];
  categories: AssistantCategory[];
  chatHistory: ChatHistoryEntry[];
  totalConversations: number;
  totalMessages: number;
}

// ── Sub-tab config ────────────────────────────────────────────────────────────

export type AssistantSubTab = "categories" | "chat-history";

export interface AssistantSubTabConfig {
  label: string;
  key: AssistantSubTab;
}

export const assistantSubTabs: AssistantSubTabConfig[] = [
  { label: "Categories", key: "categories" },
  { label: "Chat history", key: "chat-history" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract the first user message from a conversation's messages array.
 * Falls back to "(No message)" if none found.
 */
export function extractFirstUserMessage(
  messages: Array<{ role: string; content: string }>,
): string {
  const first = messages.find((m) => m.role === "user");
  return first?.content ?? "(No message)";
}

/**
 * Truncate a message to a maximum length, appending "..." if truncated.
 */
export function truncateMessage(message: string, maxLen = 80): string {
  if (message.length <= maxLen) return message;
  return `${message.slice(0, maxLen)}...`;
}

/**
 * Categorize a conversation by extracting keywords from its first user message.
 * Simple keyword-based approach — groups by first significant term.
 */
export function categorizeConversation(firstMessage: string): string {
  const lower = firstMessage.toLowerCase().trim();

  if (lower.startsWith("(no message)") || lower.length === 0) return "Other";

  // Common doc-related categories
  if (/\b(install|setup|configure|config)\b/.test(lower))
    return "Setup & Configuration";
  if (/\b(api|endpoint|route|request|response)\b/.test(lower))
    return "API Reference";
  if (/\b(error|bug|issue|fix|broken|fail)\b/.test(lower))
    return "Troubleshooting";
  if (/\b(deploy|build|ci|cd|pipeline)\b/.test(lower)) return "Deployment";
  if (/\b(auth|login|signup|token|session|oauth)\b/.test(lower))
    return "Authentication";
  if (/\b(how|what|why|when|where|can i|is it)\b/.test(lower))
    return "General Questions";
  if (/\b(example|tutorial|guide|walkthrough)\b/.test(lower))
    return "Guides & Tutorials";
  if (/\b(component|ui|style|css|tailwind|design)\b/.test(lower))
    return "UI & Components";

  return "General Questions";
}

/**
 * Format a Date or ISO string to a human-readable relative or short date.
 */
export function formatConversationDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Generate daily counts from an array of dates, filling gaps with zero.
 */
export function fillDailyConversationCounts(
  counts: DailyConversationCount[],
  dateRange: string[],
): DailyConversationCount[] {
  const lookup = new Map(counts.map((c) => [c.date, c.count]));
  return dateRange.map((date) => ({ date, count: lookup.get(date) ?? 0 }));
}

// ── CSV Export ────────────────────────────────────────────────────────────────

/**
 * Escape a CSV field — wraps in quotes if it contains commas, quotes, or newlines.
 */
export function escapeCsvField(value: string): string {
  if (/[,"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convert categories to CSV content string.
 */
export function categoriesToCsv(categories: AssistantCategory[]): string {
  const header = "Category,Conversations";
  const rows = categories.map(
    (c) => `${escapeCsvField(c.category)},${c.count}`,
  );
  return [header, ...rows].join("\n");
}

/**
 * Convert chat history to CSV content string.
 */
export function chatHistoryToCsv(history: ChatHistoryEntry[]): string {
  const header = "ID,First Message,Messages,Date";
  const rows = history.map(
    (h) =>
      `${h.id},${escapeCsvField(h.firstMessage)},${h.messageCount},${h.createdAt}`,
  );
  return [header, ...rows].join("\n");
}

/**
 * Download a string as a CSV file in the browser.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
