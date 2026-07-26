/**
 * Cloudflare Worker entry for OpenDocs.
 *
 * Routes all HTTP traffic to the OpenDocs Next.js standalone server running in
 * a Cloudflare Container. Runtime configuration (Worker Secrets + plain vars)
 * is injected into the container as environment variables on startup.
 *
 * Build-time values (NEXT_PUBLIC_*, BETTER_AUTH_URL) are baked into the image
 * via `image_vars` in wrangler.jsonc, not here.
 */
import { Container, getContainer } from "@cloudflare/containers";

/** Env keys forwarded from Worker secrets/vars into the container at runtime. */
const CONTAINER_ENV_KEYS = [
  "NODE_ENV",
  "APP_VERSION",
  "DATABASE_URL",
  "DB_PASSWORD",
  "DB_SSL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "ASSISTANT_MODEL_ID",
  "AWS_REGION",
  "S3_BUCKET",
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "GITHUB_APP_ID",
  "GITHUB_APP_SLUG",
  "GITHUB_APP_INSTALL_URL",
  "GITHUB_APP_PRIVATE_KEY",
  "GITHUB_WEBHOOK_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID",
  "STRIPE_PRO_PRICE_ID",
  "STRIPE_ENTERPRISE_PRICE_ID",
  "DOCS_PROXY_ALLOWED_HOSTS",
] as const;

export interface Env {
  OPENDOCS_CONTAINER: Parameters<typeof getContainer<OpenDocsContainer>>[0];
  /**
   * "true" makes the Worker answer every public SEO artifact itself, so crawler
   * traffic can never wake the container. Fail-closed: nothing is advertised.
   */
  SAFE_ROOT_ROBOTS?: string;
  [key: string]: unknown;
}

export class OpenDocsContainer extends Container<Env> {
  // Next.js standalone server (Dockerfile: ENV PORT=3000).
  defaultPort = 3000;
  // Stop idle containers promptly; public SEO responses are cached at the edge.
  sleepAfter = "5m";
  // The app needs egress to Postgres, OpenAI, R2, Stripe, and GitHub.
  enableInternet = true;

  constructor(ctx: ConstructorParameters<typeof Container<Env>>[0], env: Env) {
    super(ctx, env);
    const vars: Record<string, string> = {};
    for (const key of CONTAINER_ENV_KEYS) {
      const value = env[key];
      if (typeof value === "string" && value.length > 0) {
        vars[key] = value;
      }
    }
    this.envVars = vars;
  }
}

const ROOT_ROBOTS_PATH = /^\/robots\.txt$/;
const PROJECT_ROBOTS_PATH = /^\/docs\/[^/]+\/robots\.txt\/?$/;
const PROJECT_SEO_ARTIFACT_PATH =
  /^\/docs\/[^/]+\/(?:sitemap\.xml|llms(?:-full)?\.txt)\/?$/;
const LEGACY_SITEMAP_PATH = /^\/api\/docs\/([^/]+)\/sitemap\/?$/;
const PUBLIC_SEO_PATHS = [
  ROOT_ROBOTS_PATH,
  PROJECT_ROBOTS_PATH,
  PROJECT_SEO_ARTIFACT_PATH,
];

/** Marketing root stays crawlable; documentation sites are withheld. */
const SAFE_ROOT_ROBOTS_BODY = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /docs/",
  "Disallow: /api/docs/",
  "",
].join("\n");
/** Per-project robots fail closed: no documentation site is advertised. */
const SAFE_PROJECT_ROBOTS_BODY = ["User-agent: *", "Disallow: /", ""].join(
  "\n",
);
/** Crawler backoff hint when the container cannot serve an SEO artifact. */
const SEO_UNAVAILABLE_RETRY_SECONDS = 3600;
/** Bounded negative TTL so unknown subdomains stop waking the container. */
const SEO_NOT_FOUND_TTL_SECONDS = 60;

/**
 * Answers public SEO artifacts at the edge without touching the container.
 *
 * Returns null when the request is not a Worker-serviceable SEO artifact, so
 * every other route keeps its normal container-backed behaviour.
 */
export function safeSeoResponse(
  request: Request,
  enabled: boolean,
): Response | null {
  if (!enabled || (request.method !== "GET" && request.method !== "HEAD")) {
    return null;
  }

  const { pathname } = new URL(request.url);
  const isRootRobots = ROOT_ROBOTS_PATH.test(pathname);
  if (isRootRobots || PROJECT_ROBOTS_PATH.test(pathname)) {
    const body = isRootRobots
      ? SAFE_ROOT_ROBOTS_BODY
      : SAFE_PROJECT_ROBOTS_BODY;
    return new Response(request.method === "HEAD" ? null : body, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex",
      },
    });
  }

  if (
    PROJECT_SEO_ARTIFACT_PATH.test(pathname) ||
    LEGACY_SITEMAP_PATH.test(pathname)
  ) {
    return new Response(null, {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  }

  return null;
}

/**
 * Fail-closed answer for SEO artifacts when the container is unreachable or
 * erroring. Never cached, never indexable, and asks crawlers to back off so a
 * broken container is not hammered awake by retries.
 */
function seoUnavailableResponse(): Response {
  return new Response(null, {
    status: 503,
    headers: {
      "Cache-Control": "private, no-store",
      "Retry-After": String(SEO_UNAVAILABLE_RETRY_SECONDS),
      "X-Robots-Tag": "noindex",
    },
  });
}

export function isPublicSeoRequest(request: Request): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  if (
    request.headers.has("Authorization") ||
    request.headers.has("Cookie") ||
    request.headers.has("Cf-Access-Jwt-Assertion")
  ) {
    return false;
  }

  return PUBLIC_SEO_PATHS.some((pattern) =>
    pattern.test(new URL(request.url).pathname),
  );
}
export function legacySitemapRedirect(request: Request): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return null;
  }

  const url = new URL(request.url);
  const match = LEGACY_SITEMAP_PATH.exec(url.pathname);
  if (!match) return null;

  url.pathname = `/docs/${match[1]}/sitemap.xml`;
  url.search = "";
  url.hash = "";

  return new Response(null, {
    status: 308,
    headers: {
      Location: url.toString(),
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}

/**
 * Cache eligibility for Worker-served SEO artifacts.
 *
 * Successful artifacts and explicit `public` 404s are both cacheable: negative
 * caching is what stops crawlers from waking the container once per request for
 * subdomains that will never have an artifact. Anything private, authenticated,
 * cookie-bearing, no-store, or `Vary: *` is refused.
 */
export function isPublicCacheResponse(response: Response): boolean {
  if (
    (response.status !== 200 && response.status !== 404) ||
    response.headers.has("Set-Cookie")
  ) {
    return false;
  }

  const directives = (response.headers.get("Cache-Control") ?? "")
    .split(",")
    .map((directive) => directive.trim().toLowerCase().split("=", 1)[0]);

  return (
    directives.includes("public") &&
    !directives.some((directive) =>
      ["private", "no-store", "no-cache"].includes(directive),
    ) &&
    response.headers.get("Vary") !== "*"
  );
}

function cacheKeyFor(request: Request): Request {
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  return new Request(url, { method: "GET" });
}

/**
 * Normalizes an upstream SEO response for edge storage.
 *
 * Root robots gets a finite TTL so publication changes propagate, and a 404
 * without an explicit private/no-store directive becomes a bounded negative
 * cache entry. Responses that opt out of caching are left untouched so
 * `isPublicCacheResponse` rejects them.
 */
function responseForCache(request: Request, response: Response): Response {
  const clonedResponse = response.clone();
  const headers = new Headers(clonedResponse.headers);
  const cacheControl = (headers.get("Cache-Control") ?? "").toLowerCase();
  const optsOutOfCaching = ["private", "no-store", "no-cache"].some(
    (directive) => cacheControl.includes(directive),
  );

  if (new URL(request.url).pathname === "/robots.txt" && !optsOutOfCaching) {
    headers.set("Cache-Control", "public, max-age=300, s-maxage=300");
  } else if (clonedResponse.status === 404 && !optsOutOfCaching) {
    headers.set(
      "Cache-Control",
      `public, max-age=${SEO_NOT_FOUND_TTL_SECONDS}, s-maxage=${SEO_NOT_FOUND_TTL_SECONDS}`,
    );
    headers.set("X-Robots-Tag", "noindex");
  }

  return new Response(clonedResponse.body, {
    status: clonedResponse.status,
    statusText: clonedResponse.statusText,
    headers,
  });
}

function headResponse(response: Response): Response {
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: { waitUntil(promise: Promise<unknown>): void },
  ): Promise<Response> {
    const safeSeo = safeSeoResponse(request, env.SAFE_ROOT_ROBOTS === "true");
    if (safeSeo) return safeSeo;
    const legacyRedirect = legacySitemapRedirect(request);
    if (legacyRedirect) return legacyRedirect;

    const container = getContainer(env.OPENDOCS_CONTAINER);
    if (!isPublicSeoRequest(request)) {
      return container.fetch(request);
    }

    const cache = (
      caches as unknown as {
        default: Pick<Cache, "match" | "put">;
      }
    ).default;
    const cacheKey = cacheKeyFor(request);
    const cached = await cache.match(cacheKey);
    if (cached) {
      return request.method === "HEAD" ? headResponse(cached) : cached;
    }

    let response: Response;
    try {
      response = await container.fetch(request);
    } catch {
      return seoUnavailableResponse();
    }
    if (response.status >= 500) {
      return seoUnavailableResponse();
    }

    if (request.method === "GET") {
      const cachedResponse = responseForCache(request, response);
      if (isPublicCacheResponse(cachedResponse)) {
        ctx.waitUntil(cache.put(cacheKey, cachedResponse));
      }
    }
    return response;
  },
};
