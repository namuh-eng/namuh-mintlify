import { describe, expect, it } from "vitest";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Split a full name into first + last (mirrors the logic the page will use). */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) {
    return { firstName: "", lastName: "" };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

/** Join first + last into a single full name for storage. */
function joinName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

/** Validate profile update payload. */
function validateProfilePayload(payload: {
  firstName?: string;
  lastName?: string;
  emailNotifications?: boolean;
}): { valid: boolean; error?: string } {
  if (
    payload.firstName !== undefined &&
    typeof payload.firstName !== "string"
  ) {
    return { valid: false, error: "firstName must be a string" };
  }
  if (payload.lastName !== undefined && typeof payload.lastName !== "string") {
    return { valid: false, error: "lastName must be a string" };
  }
  if (
    payload.firstName !== undefined &&
    payload.firstName.trim().length === 0
  ) {
    return { valid: false, error: "First name is required" };
  }
  if (
    payload.emailNotifications !== undefined &&
    typeof payload.emailNotifications !== "boolean"
  ) {
    return { valid: false, error: "emailNotifications must be a boolean" };
  }
  return { valid: true };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("Profile settings — name splitting", () => {
  it("splits 'John Doe' into first and last", () => {
    expect(splitName("John Doe")).toEqual({
      firstName: "John",
      lastName: "Doe",
    });
  });

  it("handles single name (no last name)", () => {
    expect(splitName("John")).toEqual({ firstName: "John", lastName: "" });
  });

  it("handles three-part names", () => {
    expect(splitName("Mary Jane Watson")).toEqual({
      firstName: "Mary",
      lastName: "Jane Watson",
    });
  });

  it("handles empty string", () => {
    expect(splitName("")).toEqual({ firstName: "", lastName: "" });
  });

  it("trims whitespace", () => {
    expect(splitName("  John   Doe  ")).toEqual({
      firstName: "John",
      lastName: "Doe",
    });
  });
});

describe("Profile settings — name joining", () => {
  it("joins first and last name", () => {
    expect(joinName("John", "Doe")).toBe("John Doe");
  });

  it("handles empty last name", () => {
    expect(joinName("John", "")).toBe("John");
  });

  it("handles empty first name", () => {
    expect(joinName("", "Doe")).toBe("Doe");
  });

  it("trims extra whitespace", () => {
    expect(joinName("  John ", " Doe  ")).toBe("John Doe");
  });
});

describe("Profile settings — payload validation", () => {
  it("accepts valid payload with name fields", () => {
    expect(
      validateProfilePayload({ firstName: "John", lastName: "Doe" }),
    ).toEqual({ valid: true });
  });

  it("accepts valid payload with emailNotifications", () => {
    expect(validateProfilePayload({ emailNotifications: true })).toEqual({
      valid: true,
    });
  });

  it("rejects empty first name", () => {
    const result = validateProfilePayload({ firstName: "  ", lastName: "Doe" });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("First name");
  });

  it("rejects non-string firstName", () => {
    const result = validateProfilePayload({
      firstName: 123 as unknown as string,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects non-boolean emailNotifications", () => {
    const result = validateProfilePayload({
      emailNotifications: "yes" as unknown as boolean,
    });
    expect(result.valid).toBe(false);
  });

  it("accepts partial payload (only lastName)", () => {
    expect(validateProfilePayload({ lastName: "Doe" })).toEqual({
      valid: true,
    });
  });
});
