/**
 * Utilities for the agent management dashboard page (/products/agent).
 */

export type AgentJobStatus = "pending" | "running" | "succeeded" | "failed";

export interface AgentJobSummary {
  id: string;
  prompt: string;
  status: AgentJobStatus;
  prUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentJobDetail extends AgentJobSummary {
  projectId: string;
  messages: { role: "user" | "agent"; content: string; timestamp: string }[];
}

/** Return a human-readable label for an agent job status. */
export function statusLabel(status: AgentJobStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "running":
      return "Running";
    case "succeeded":
      return "Succeeded";
    case "failed":
      return "Failed";
  }
}

/** Return a CSS-friendly color token for the status badge. */
export function statusColor(status: AgentJobStatus): string {
  switch (status) {
    case "pending":
      return "yellow";
    case "running":
      return "blue";
    case "succeeded":
      return "green";
    case "failed":
      return "red";
  }
}

/** Truncate a prompt for display in the list view. */
export function truncatePrompt(prompt: string, maxLength = 80): string {
  if (prompt.length <= maxLength) return prompt;
  return `${prompt.slice(0, maxLength).trimEnd()}…`;
}

/** Format a date string as relative time (e.g. "2m ago", "3h ago"). */
export function timeAgo(dateStr: string, now?: Date): string {
  const date = new Date(dateStr);
  const ref = now ?? new Date();
  const seconds = Math.floor((ref.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Validate a prompt string for submission. */
export function validatePrompt(prompt: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Prompt cannot be empty" };
  }
  if (trimmed.length > 5000) {
    return { valid: false, error: "Prompt must be 5000 characters or less" };
  }
  return { valid: true };
}

/** Extract GitHub PR number from a PR URL, or null if invalid. */
export function extractPrNumber(prUrl: string | null): number | null {
  if (!prUrl) return null;
  const match = prUrl.match(/\/pull\/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}
