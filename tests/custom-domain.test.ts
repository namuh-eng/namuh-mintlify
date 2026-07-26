import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  domainVerificationStatus,
  generateCnameTarget,
  isConfiguredAppHost,
  isInternalProbeHost,
  normalizeHostHeader,
  resolveManagedDocsSubdomain,
  validateCustomDomain,
} from "@/lib/domains";

describe("validateCustomDomain", () => {
  it("accepts a valid domain", () => {
    expect(validateCustomDomain("docs.example.com")).toBeNull();
  });

  it("accepts a bare domain", () => {
    expect(validateCustomDomain("example.com")).toBeNull();
  });

  it("accepts deeply nested subdomains", () => {
    expect(validateCustomDomain("a.b.c.example.com")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(validateCustomDomain("")).toBe("Domain is required");
  });

  it("rejects whitespace only", () => {
    expect(validateCustomDomain("   ")).toBe("Domain is required");
  });

  it("rejects domains with protocol", () => {
    expect(validateCustomDomain("https://example.com")).toBe(
      "Enter the domain without http:// or https://",
    );
  });

  it("rejects domains with http protocol", () => {
    expect(validateCustomDomain("http://example.com")).toBe(
      "Enter the domain without http:// or https://",
    );
  });

  it("rejects domains with trailing slash", () => {
    expect(validateCustomDomain("example.com/")).toBe(
      "Domain should not contain a path",
    );
  });

  it("rejects domains with path", () => {
    expect(validateCustomDomain("example.com/docs")).toBe(
      "Domain should not contain a path",
    );
  });

  it("rejects domains with spaces", () => {
    expect(validateCustomDomain("example .com")).toBe("Invalid domain format");
  });

  it("rejects single-label domains", () => {
    expect(validateCustomDomain("localhost")).toBe(
      "Domain must have at least two parts (e.g. docs.example.com)",
    );
  });

  it("rejects domains longer than 253 characters", () => {
    const long = `${"a".repeat(250)}.com`;
    expect(validateCustomDomain(long)).toBe(
      "Domain must be at most 253 characters",
    );
  });

  it("trims whitespace before validating", () => {
    expect(validateCustomDomain("  docs.example.com  ")).toBeNull();
  });
});

describe("generateCnameTarget", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_DOCS_ROOT_DOMAIN", "hosting.example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("generates a CNAME target from subdomain", () => {
    expect(generateCnameTarget("my-docs")).toBe("my-docs.hosting.example.com");
  });

  it("generates a CNAME target from a different subdomain", () => {
    expect(generateCnameTarget("acme-api")).toBe(
      "acme-api.hosting.example.com",
    );
  });

  it("returns null when managed docs hosting is not configured", () => {
    vi.stubEnv("NEXT_PUBLIC_DOCS_ROOT_DOMAIN", "");
    expect(generateCnameTarget("acme-api")).toBeNull();
  });
});

describe("domainVerificationStatus", () => {
  it('returns "not_configured" when no domain is set', () => {
    expect(domainVerificationStatus(null, null)).toBe("not_configured");
  });

  it('returns "pending" when domain is set but not verified', () => {
    expect(domainVerificationStatus("docs.example.com", null)).toBe("pending");
  });

  it('returns "pending" when verifiedAt is undefined', () => {
    expect(domainVerificationStatus("docs.example.com", undefined)).toBe(
      "pending",
    );
  });

  it('returns "verified" when domain is set and verifiedAt is present', () => {
    expect(
      domainVerificationStatus("docs.example.com", "2025-01-01T00:00:00Z"),
    ).toBe("verified");
  });
});

describe("normalizeHostHeader", () => {
  it("lowercases hosts and strips ports", () => {
    expect(normalizeHostHeader("Docs.Example.COM:443")).toBe(
      "docs.example.com",
    );
  });

  it("uses the first forwarded host", () => {
    expect(normalizeHostHeader("docs.example.com, proxy.internal")).toBe(
      "docs.example.com",
    );
  });
});

describe("resolveManagedDocsSubdomain", () => {
  it("extracts subdomains from the configured docs root", () => {
    const previous = process.env.NEXT_PUBLIC_DOCS_ROOT_DOMAIN;
    process.env.NEXT_PUBLIC_DOCS_ROOT_DOMAIN = "hosting.example.com";

    expect(resolveManagedDocsSubdomain("acme.hosting.example.com")).toBe(
      "acme",
    );
    expect(resolveManagedDocsSubdomain("hosting.example.com")).toBeNull();
    expect(resolveManagedDocsSubdomain("docs.example.com")).toBeNull();

    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_DOCS_ROOT_DOMAIN;
    } else {
      process.env.NEXT_PUBLIC_DOCS_ROOT_DOMAIN = previous;
    }
  });
});

describe("isConfiguredAppHost", () => {
  it("treats localhost and configured app hosts as first-party app hosts", () => {
    const previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";

    expect(isConfiguredAppHost("localhost")).toBe(true);
    expect(isConfiguredAppHost("app.example.com")).toBe(true);
    expect(isConfiguredAppHost("docs.customer.com")).toBe(false);

    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = previous;
    }
  });
});

describe("isInternalProbeHost", () => {
  it("treats single-label readiness hosts as infrastructure-only", () => {
    expect(isInternalProbeHost("container-readiness")).toBe(true);
  });

  it("treats missing, loopback, and single-label hosts as infrastructure-only", () => {
    expect(isInternalProbeHost(null)).toBe(true);
    expect(isInternalProbeHost(undefined)).toBe(true);
    expect(isInternalProbeHost("")).toBe(true);
    expect(isInternalProbeHost("localhost")).toBe(true);
    expect(isInternalProbeHost("127.0.0.1")).toBe(true);
    expect(isInternalProbeHost("[::1]")).toBe(true);
    expect(isInternalProbeHost("internal-probe")).toBe(true);
  });

  it("still allows real multi-label custom docs domains", () => {
    expect(isInternalProbeHost("docs.customer.com")).toBe(false);
    expect(isInternalProbeHost("app.example.com")).toBe(false);
    expect(isInternalProbeHost("a.b.c.example.com")).toBe(false);
  });
});
