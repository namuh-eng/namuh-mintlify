import { describe, expect, it } from "vitest";

import {
  canManageRole,
  formatMemberForResponse,
  validateInviteRequest,
  validateRoleUpdate,
} from "@/lib/members";

describe("members — validateInviteRequest", () => {
  it("accepts a valid invite with email and role", () => {
    const result = validateInviteRequest({
      email: "alice@example.com",
      role: "editor",
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.email).toBe("alice@example.com");
    expect(result.role).toBe("editor");
  });

  it("defaults role to viewer when omitted", () => {
    const result = validateInviteRequest({ email: "bob@example.com" });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.role).toBe("viewer");
  });

  it("rejects missing email", () => {
    const result = validateInviteRequest({ role: "editor" });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/email/i);
  });

  it("rejects empty email", () => {
    const result = validateInviteRequest({ email: "  ", role: "viewer" });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/email/i);
  });

  it("rejects invalid email format", () => {
    const result = validateInviteRequest({
      email: "notanemail",
      role: "viewer",
    });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/email/i);
  });

  it("rejects invalid role", () => {
    const result = validateInviteRequest({
      email: "x@y.com",
      role: "superadmin",
    });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/role/i);
  });

  it("trims and lowercases email", () => {
    const result = validateInviteRequest({
      email: "  Alice@Example.COM  ",
      role: "admin",
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.email).toBe("alice@example.com");
  });
});

describe("members — validateRoleUpdate", () => {
  it("accepts a valid role", () => {
    const result = validateRoleUpdate({ role: "admin" });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.role).toBe("admin");
  });

  it("rejects missing role", () => {
    const result = validateRoleUpdate({});
    expect(result.valid).toBe(false);
  });

  it("rejects invalid role value", () => {
    const result = validateRoleUpdate({ role: "owner" });
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.error).toMatch(/role/i);
  });
});

describe("members — canManageRole", () => {
  it("admin can assign editor", () => {
    expect(canManageRole("admin", "editor")).toBe(true);
  });

  it("admin can assign viewer", () => {
    expect(canManageRole("admin", "viewer")).toBe(true);
  });

  it("admin can assign admin", () => {
    expect(canManageRole("admin", "admin")).toBe(true);
  });

  it("editor cannot assign any role", () => {
    expect(canManageRole("editor", "viewer")).toBe(false);
    expect(canManageRole("editor", "admin")).toBe(false);
  });

  it("viewer cannot assign any role", () => {
    expect(canManageRole("viewer", "editor")).toBe(false);
  });
});

describe("members — formatMemberForResponse", () => {
  it("formats a member row into a clean response object", () => {
    const raw = {
      membershipId: "m-1",
      userId: "u-1",
      role: "admin" as const,
      joinedAt: new Date("2026-01-15T00:00:00Z"),
      userName: "Alice",
      userEmail: "alice@example.com",
      userImage: "https://example.com/alice.jpg",
    };
    const result = formatMemberForResponse(raw);
    expect(result).toEqual({
      id: "m-1",
      userId: "u-1",
      name: "Alice",
      email: "alice@example.com",
      image: "https://example.com/alice.jpg",
      role: "admin",
      joinedAt: "2026-01-15T00:00:00.000Z",
    });
  });

  it("handles null image", () => {
    const raw = {
      membershipId: "m-2",
      userId: "u-2",
      role: "viewer" as const,
      joinedAt: new Date("2026-02-01T00:00:00Z"),
      userName: "Bob",
      userEmail: "bob@example.com",
      userImage: null,
    };
    const result = formatMemberForResponse(raw);
    expect(result.image).toBeNull();
    expect(result.name).toBe("Bob");
  });
});
