import { describe, expect, it } from "vitest";
import { validateFeedbackPayload } from "../src/lib/feedback";

// ── Feedback API validation logic ────────────────────────────────────────────

describe("Feedback payload validation", () => {
  it("accepts valid helpful feedback without comment", () => {
    const result = validateFeedbackPayload({
      page: "/getting-started",
      rating: "helpful",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.rating).toBe("helpful");
      expect(result.data.page).toBe("/getting-started");
      expect(result.data.comment).toBeUndefined();
    }
  });

  it("accepts valid not_helpful feedback with comment", () => {
    const result = validateFeedbackPayload({
      page: "/api-reference/auth",
      rating: "not_helpful",
      comment: "Missing examples for OAuth flow",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.rating).toBe("not_helpful");
      expect(result.data.comment).toBe("Missing examples for OAuth flow");
    }
  });

  it("rejects missing page", () => {
    const result = validateFeedbackPayload({ rating: "helpful" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("page");
  });

  it("rejects empty page string", () => {
    const result = validateFeedbackPayload({ page: "  ", rating: "helpful" });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid rating", () => {
    const result = validateFeedbackPayload({
      page: "/docs",
      rating: "thumbs_up",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("rating");
  });

  it("rejects null body", () => {
    const result = validateFeedbackPayload(null);
    expect(result.ok).toBe(false);
  });

  it("truncates long comments to 2000 chars", () => {
    const longComment = "x".repeat(3000);
    const result = validateFeedbackPayload({
      page: "/docs",
      rating: "helpful",
      comment: longComment,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.comment?.length).toBe(2000);
    }
  });

  it("rejects non-string comment", () => {
    const result = validateFeedbackPayload({
      page: "/docs",
      rating: "helpful",
      comment: 123,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("comment");
  });

  it("trims page whitespace", () => {
    const result = validateFeedbackPayload({
      page: "  /getting-started  ",
      rating: "helpful",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.page).toBe("/getting-started");
    }
  });
});

// ── Feedback widget state machine ────────────────────────────────────────────

type WidgetState = "idle" | "rated" | "submitting" | "submitted";

interface WidgetStore {
  state: WidgetState;
  rating: "helpful" | "not_helpful" | null;
  comment: string;
  showTextInput: boolean;
}

function createInitialState(): WidgetStore {
  return { state: "idle", rating: null, comment: "", showTextInput: false };
}

function handleRate(
  store: WidgetStore,
  rating: "helpful" | "not_helpful",
): WidgetStore {
  return { ...store, state: "rated", rating, showTextInput: true };
}

function handleCommentChange(store: WidgetStore, text: string): WidgetStore {
  return { ...store, comment: text };
}

function handleSubmitStart(store: WidgetStore): WidgetStore {
  return { ...store, state: "submitting" };
}

function handleSubmitSuccess(store: WidgetStore): WidgetStore {
  return { ...store, state: "submitted" };
}

describe("Feedback widget state machine", () => {
  it("starts in idle state with no rating", () => {
    const state = createInitialState();
    expect(state.state).toBe("idle");
    expect(state.rating).toBeNull();
    expect(state.showTextInput).toBe(false);
  });

  it("transitions to rated state on thumbs up", () => {
    let state = createInitialState();
    state = handleRate(state, "helpful");
    expect(state.state).toBe("rated");
    expect(state.rating).toBe("helpful");
    expect(state.showTextInput).toBe(true);
  });

  it("transitions to rated state on thumbs down", () => {
    let state = createInitialState();
    state = handleRate(state, "not_helpful");
    expect(state.state).toBe("rated");
    expect(state.rating).toBe("not_helpful");
  });

  it("allows changing comment text in rated state", () => {
    let state = createInitialState();
    state = handleRate(state, "helpful");
    state = handleCommentChange(state, "Great docs!");
    expect(state.comment).toBe("Great docs!");
    expect(state.state).toBe("rated");
  });

  it("transitions to submitting then submitted", () => {
    let state = createInitialState();
    state = handleRate(state, "not_helpful");
    state = handleCommentChange(state, "Needs more detail");
    state = handleSubmitStart(state);
    expect(state.state).toBe("submitting");
    state = handleSubmitSuccess(state);
    expect(state.state).toBe("submitted");
  });

  it("preserves rating through submission flow", () => {
    let state = createInitialState();
    state = handleRate(state, "helpful");
    state = handleSubmitStart(state);
    state = handleSubmitSuccess(state);
    expect(state.rating).toBe("helpful");
  });
});
