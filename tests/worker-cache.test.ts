import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  containerFetch: vi.fn(),
  cacheMatch: vi.fn(),
  cachePut: vi.fn(),
  waitUntil: vi.fn(),
}));

vi.mock("@cloudflare/containers", () => ({
  Container: class {},
  getContainer: () => ({ fetch: mocks.containerFetch }),
}));

import worker, {
  isPublicCacheResponse,
  isPublicSeoRequest,
  safeSeoResponse,
} from "../worker/index";

const env = {} as never;
const ctx = { waitUntil: mocks.waitUntil } as never;

describe("worker public SEO cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cacheMatch.mockResolvedValue(undefined);
    mocks.cachePut.mockResolvedValue(undefined);
    vi.stubGlobal("caches", {
      default: {
        match: mocks.cacheMatch,
        put: mocks.cachePut,
      },
    });
  });

  it("limits eligibility to anonymous GET and HEAD requests for SEO artifacts", () => {
    expect(
      isPublicSeoRequest(
        new Request("https://docs.example.com/docs/public/sitemap.xml"),
      ),
    ).toBe(true);
    expect(
      isPublicSeoRequest(
        new Request("https://docs.example.com/docs/public/llms-full.txt", {
          method: "HEAD",
        }),
      ),
    ).toBe(true);
    expect(
      isPublicSeoRequest(
        new Request("https://docs.example.com/docs/public/sitemap.xml", {
          headers: { Authorization: "Bearer secret" },
        }),
      ),
    ).toBe(false);
    expect(
      isPublicSeoRequest(
        new Request("https://docs.example.com/robots.txt", {
          headers: { Cookie: "session=secret" },
        }),
      ),
    ).toBe(false);
    expect(
      isPublicSeoRequest(
        new Request("https://docs.example.com/docs/public/sitemap.xml", {
          method: "POST",
        }),
      ),
    ).toBe(false);
    expect(
      isPublicSeoRequest(
        new Request("https://docs.example.com/docs/public/getting-started"),
      ),
    ).toBe(false);
  });

  it("can fail closed at the edge without waking the container", async () => {
    const request = new Request("https://docs.example.com/robots.txt");
    const response = safeSeoResponse(request, true);

    expect(response).not.toBeNull();
    expect(await response?.text()).toBe(
      "User-agent: *\nAllow: /\nDisallow: /docs/\nDisallow: /api/docs/\n",
    );
    expect(response?.headers.get("X-Robots-Tag")).toBe("noindex");

    const workerResponse = await worker.fetch(
      request,
      { SAFE_ROOT_ROBOTS: "true" } as never,
      ctx,
    );
    expect(await workerResponse.text()).toContain("Disallow: /docs/");
    expect(mocks.containerFetch).not.toHaveBeenCalled();
    expect(mocks.cacheMatch).not.toHaveBeenCalled();
  });

  it("fails closed for canonical and legacy sitemaps", async () => {
    for (const path of [
      "/docs/private/sitemap.xml",
      "/api/docs/private/sitemap",
    ]) {
      const response = await worker.fetch(
        new Request(`https://docs.example.com${path}`),
        { SAFE_ROOT_ROBOTS: "true" } as never,
        ctx,
      );
      expect(response.status).toBe(404);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    }

    expect(mocks.containerFetch).not.toHaveBeenCalled();
    expect(mocks.cacheMatch).not.toHaveBeenCalled();
  });

  it("caches only explicitly public, cookie-free responses", () => {
    expect(
      isPublicCacheResponse(
        new Response("public", {
          headers: { "Cache-Control": "public, s-maxage=3600" },
        }),
      ),
    ).toBe(true);

    for (const cacheControl of [
      "private, max-age=60",
      "public, no-store",
      "public, no-cache",
      "max-age=60",
    ]) {
      expect(
        isPublicCacheResponse(
          new Response("unsafe", {
            headers: { "Cache-Control": cacheControl },
          }),
        ),
      ).toBe(false);
    }

    expect(
      isPublicCacheResponse(
        new Response("cookie", {
          headers: {
            "Cache-Control": "public, max-age=60",
            "Set-Cookie": "session=secret",
          },
        }),
      ),
    ).toBe(false);
  });

  it("stores eligible GET responses under a bodyless GET cache key", async () => {
    mocks.containerFetch.mockResolvedValue(
      new Response("sitemap", {
        headers: { "Cache-Control": "public, s-maxage=3600" },
      }),
    );
    const request = new Request(
      "https://docs.example.com/docs/public/sitemap.xml?utm_source=crawler",
    );

    const response = await worker.fetch(request, env, ctx);

    expect(await response.text()).toBe("sitemap");
    expect(mocks.containerFetch).toHaveBeenCalledWith(request);
    expect(mocks.cachePut).toHaveBeenCalledOnce();
    const [cacheKey, cachedResponse] = mocks.cachePut.mock.calls[0] as [
      Request,
      Response,
    ];
    expect(cacheKey.method).toBe("GET");
    expect(cacheKey.url).toBe(
      "https://docs.example.com/docs/public/sitemap.xml",
    );
    expect(await cachedResponse.text()).toBe("sitemap");
    expect(mocks.waitUntil).toHaveBeenCalledWith(expect.any(Promise));
  });
  it("redirects legacy sitemap requests before waking the container", async () => {
    const response = await worker.fetch(
      new Request(
        "https://docs.example.com/api/docs/public/sitemap?utm_source=old",
      ),
      env,
      ctx,
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("Location")).toBe(
      "https://docs.example.com/docs/public/sitemap.xml",
    );
    expect(mocks.containerFetch).not.toHaveBeenCalled();
    expect(mocks.cacheMatch).not.toHaveBeenCalled();
  });

  it("stores root robots with a finite edge TTL", async () => {
    mocks.containerFetch.mockResolvedValue(
      new Response("User-agent: *", {
        headers: {
          "Cache-Control": "public, max-age=0, must-revalidate",
        },
      }),
    );

    await worker.fetch(
      new Request("https://docs.example.com/robots.txt"),
      env,
      ctx,
    );

    const [, cachedResponse] = mocks.cachePut.mock.calls[0] as [
      Request,
      Response,
    ];
    expect(cachedResponse.headers.get("Cache-Control")).toBe(
      "public, max-age=300, s-maxage=300",
    );
  });

  it("serves cached HEAD requests without a body", async () => {
    mocks.cacheMatch.mockResolvedValue(
      new Response("cached sitemap", {
        headers: {
          "Cache-Control": "public, max-age=3600",
          "Content-Type": "application/xml",
        },
      }),
    );

    const response = await worker.fetch(
      new Request("https://docs.example.com/docs/public/sitemap.xml", {
        method: "HEAD",
      }),
      env,
      ctx,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/xml");
    expect(await response.text()).toBe("");
    expect(mocks.containerFetch).not.toHaveBeenCalled();
    expect(mocks.cachePut).not.toHaveBeenCalled();
  });

  it("bypasses cache and preserves non-SEO request method and body", async () => {
    mocks.containerFetch.mockImplementation(async (request: Request) =>
      Response.json({ method: request.method, body: await request.text() }),
    );
    const request = new Request("https://docs.example.com/api/search", {
      method: "POST",
      body: "query=cache",
    });

    const response = await worker.fetch(request, env, ctx);

    await expect(response.json()).resolves.toEqual({
      method: "POST",
      body: "query=cache",
    });
    expect(mocks.cacheMatch).not.toHaveBeenCalled();
    expect(mocks.cachePut).not.toHaveBeenCalled();
  });
});
