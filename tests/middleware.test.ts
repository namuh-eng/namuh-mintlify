import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSessionCookieMock = vi.fn();

vi.mock("better-auth/cookies", () => ({
  getSessionCookie: getSessionCookieMock,
}));

function makeNextRequest(url: string): NextRequest {
  const request = new Request(url) as NextRequest;
  Object.defineProperty(request, "nextUrl", {
    value: new URL(url),
    configurable: true,
  });
  return request;
}

describe("Proxy", () => {
  it("redirects unauthenticated users to login for protected routes", async () => {
    getSessionCookieMock.mockReturnValue(null);
    const { proxy } = await import("@/proxy");
    const response = await proxy(makeNextRequest("http://localhost/dashboard"));

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toContain("/login");
  });

  it("redirects unauthenticated Mintlify-style workspace home routes with returnTo", async () => {
    getSessionCookieMock.mockReturnValue(null);
    const { config, proxy } = await import("@/proxy");
    const response = await proxy(
      makeNextRequest("http://localhost/namuhinc/namuhinc/home?tab=activity"),
    );

    expect(config.matcher).toContain("/:orgSlug/:projectSlug/home");
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe(
      "http://localhost/login?returnTo=%2Fnamuhinc%2Fnamuhinc%2Fhome%3Ftab%3Dactivity",
    );
  });

  it("adds Server-Timing header for performance monitoring", async () => {
    getSessionCookieMock.mockReturnValue({ session: { id: "session-1" } });
    const { proxy } = await import("@/proxy");
    const response = await proxy(makeNextRequest("http://localhost/dashboard"));

    expect(response?.headers.get("Server-Timing")).toContain("proxy;dur=");
  });

  it("allows access to unprotected routes", async () => {
    getSessionCookieMock.mockReturnValue(null);
    const { proxy } = await import("@/proxy");
    const response = await proxy(makeNextRequest("http://localhost/"));

    // NextResponse.next() in tests returns a response with status 200 or similar
    expect(response?.status).toBe(200);
  });
});

describe("Proxy container startup safety", () => {
  const originalFetch = globalThis.fetch;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  function makeHostRequest(url: string, host: string): NextRequest {
    const request = new Request(url, { headers: { host } }) as NextRequest;
    Object.defineProperty(request, "nextUrl", {
      value: new URL(url),
      configurable: true,
    });
    return request;
  }

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    getSessionCookieMock.mockReturnValue(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }
  });

  it("never resolves single-label infrastructure probe hosts", async () => {
    const fetchSpy = vi.fn(async () => new Response("{}"));
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const { proxy } = await import("@/proxy");
    const response = await proxy(
      makeHostRequest("http://container-readiness/", "container-readiness"),
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(response?.status).toBe(200);
  });

  it("bounds the custom-domain lookup with an abort signal", async () => {
    const fetchSpy = vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return new Response(JSON.stringify({ subdomain: "acme" }), {
        headers: { "content-type": "application/json" },
      });
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const { proxy } = await import("@/proxy");
    const response = await proxy(
      makeHostRequest("http://docs.customer.com/guide", "docs.customer.com"),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(response?.headers.get("X-OpenDocs-Resolved-Host")).toBe(
      "docs.customer.com",
    );
  });

  it("falls back to the not-found page when the lookup aborts", async () => {
    globalThis.fetch = (async () => {
      throw new DOMException("The operation was aborted.", "TimeoutError");
    }) as unknown as typeof fetch;

    const { proxy } = await import("@/proxy");
    const response = await proxy(
      makeHostRequest("http://docs.customer.com/guide", "docs.customer.com"),
    );

    expect(response?.status).toBe(404);
  });
});
