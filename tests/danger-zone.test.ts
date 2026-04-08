import { describe, expect, it } from "vitest";

/* ------------------------------------------------------------------ */
/*  Validation helpers — mirrored from the API route logic             */
/* ------------------------------------------------------------------ */

/** Minimum reason length for destructive actions */
const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 1000;

function validateDeleteReason(
  reason: unknown,
): { valid: true; reason: string } | { valid: false; error: string } {
  if (typeof reason !== "string" || reason.trim().length < MIN_REASON_LENGTH) {
    return {
      valid: false,
      error: `Reason must be at least ${MIN_REASON_LENGTH} characters`,
    };
  }
  if (reason.trim().length > MAX_REASON_LENGTH) {
    return {
      valid: false,
      error: `Reason must be at most ${MAX_REASON_LENGTH} characters`,
    };
  }
  return { valid: true, reason: reason.trim() };
}

function validateDeleteProjectRequest(body: Record<string, unknown>): {
  valid: boolean;
  error?: string;
  reason?: string;
} {
  if (!body.projectId || typeof body.projectId !== "string") {
    return { valid: false, error: "projectId is required" };
  }
  const reasonResult = validateDeleteReason(body.reason);
  if (!reasonResult.valid) {
    return { valid: false, error: reasonResult.error };
  }
  return { valid: true, reason: reasonResult.reason };
}

function validateDeleteOrgRequest(body: Record<string, unknown>): {
  valid: boolean;
  error?: string;
  reason?: string;
} {
  if (!body.orgId || typeof body.orgId !== "string") {
    return { valid: false, error: "orgId is required" };
  }
  const reasonResult = validateDeleteReason(body.reason);
  if (!reasonResult.valid) {
    return { valid: false, error: reasonResult.error };
  }
  return { valid: true, reason: reasonResult.reason };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("Danger Zone — Validation", () => {
  describe("validateDeleteReason", () => {
    it("rejects empty reason", () => {
      const result = validateDeleteReason("");
      expect(result.valid).toBe(false);
    });

    it("rejects reason shorter than minimum", () => {
      const result = validateDeleteReason("ab");
      expect(result.valid).toBe(false);
    });

    it("accepts valid reason", () => {
      const result = validateDeleteReason("No longer needed");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.reason).toBe("No longer needed");
      }
    });

    it("trims whitespace from reason", () => {
      const result = validateDeleteReason("  some reason  ");
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.reason).toBe("some reason");
      }
    });

    it("rejects non-string reason", () => {
      const result = validateDeleteReason(123);
      expect(result.valid).toBe(false);
    });

    it("rejects reason over max length", () => {
      const result = validateDeleteReason("x".repeat(1001));
      expect(result.valid).toBe(false);
    });

    it("accepts reason at max length", () => {
      const result = validateDeleteReason("x".repeat(1000));
      expect(result.valid).toBe(true);
    });
  });

  describe("validateDeleteProjectRequest", () => {
    it("rejects missing projectId", () => {
      const result = validateDeleteProjectRequest({ reason: "testing" });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("projectId is required");
    });

    it("rejects non-string projectId", () => {
      const result = validateDeleteProjectRequest({
        projectId: 123,
        reason: "testing",
      });
      expect(result.valid).toBe(false);
    });

    it("rejects missing reason", () => {
      const result = validateDeleteProjectRequest({
        projectId: "abc-123",
      });
      expect(result.valid).toBe(false);
    });

    it("accepts valid request", () => {
      const result = validateDeleteProjectRequest({
        projectId: "abc-123",
        reason: "No longer needed",
      });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("No longer needed");
    });
  });

  describe("validateDeleteOrgRequest", () => {
    it("rejects missing orgId", () => {
      const result = validateDeleteOrgRequest({ reason: "testing" });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("orgId is required");
    });

    it("rejects missing reason", () => {
      const result = validateDeleteOrgRequest({ orgId: "org-123" });
      expect(result.valid).toBe(false);
    });

    it("accepts valid request", () => {
      const result = validateDeleteOrgRequest({
        orgId: "org-123",
        reason: "Shutting down",
      });
      expect(result.valid).toBe(true);
      expect(result.reason).toBe("Shutting down");
    });
  });
});

describe("Danger Zone — UI behavior expectations", () => {
  function canDelete(
    reason: string,
    confirmText: string,
    name: string,
  ): boolean {
    return reason.length >= MIN_REASON_LENGTH && confirmText === name;
  }

  it("requires both reason and confirmation to delete deployment", () => {
    expect(canDelete("", "", "my-docs")).toBe(false);
  });

  it("enables delete when reason is provided and name matches", () => {
    expect(canDelete("Shutting down this project", "my-docs", "my-docs")).toBe(
      true,
    );
  });

  it("requires both reason and confirmation to delete organization", () => {
    expect(canDelete("", "", "acme-corp")).toBe(false);
  });

  it("enables org delete when reason provided and name matches", () => {
    expect(canDelete("Company shutting down", "acme-corp", "acme-corp")).toBe(
      true,
    );
  });

  it("confirmation text is case-sensitive", () => {
    expect(canDelete("valid reason", "My-Docs", "my-docs")).toBe(false);
  });
});
