/** Feedback payload validation — shared between API route and tests */

export interface FeedbackPayload {
  page: string;
  rating: "helpful" | "not_helpful";
  comment?: string;
}

export function validateFeedbackPayload(
  body: unknown,
): { ok: true; data: FeedbackPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const { page, rating, comment } = body as Record<string, unknown>;

  if (typeof page !== "string" || page.trim().length === 0) {
    return { ok: false, error: "page is required" };
  }

  if (rating !== "helpful" && rating !== "not_helpful") {
    return { ok: false, error: "rating must be 'helpful' or 'not_helpful'" };
  }

  if (comment !== undefined && typeof comment !== "string") {
    return { ok: false, error: "comment must be a string" };
  }

  const trimmedComment =
    typeof comment === "string" ? comment.slice(0, 2000) : undefined;

  return {
    ok: true,
    data: { page: page.trim(), rating, comment: trimmedComment },
  };
}
