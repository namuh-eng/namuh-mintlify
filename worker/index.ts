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

const PUBLIC_SEO_PATHS = [
  /^\/robots\.txt$/,
  /^\/docs\/[^/]+\/(?:robots\.txt|sitemap\.xml|llms(?:-full)?\.txt)$/,
];
const LEGACY_SITEMAP_PATH = /^\/api\/docs\/([^/]+)\/sitemap\/?$/;

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

export function isPublicCacheResponse(response: Response): boolean {
  if (response.status !== 200 || response.headers.has("Set-Cookie")) {
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

function responseForCache(request: Request, response: Response): Response {
  const clonedResponse = response.clone();
  const headers = new Headers(clonedResponse.headers);
  if (new URL(request.url).pathname === "/robots.txt") {
    headers.set("Cache-Control", "public, max-age=300, s-maxage=300");
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

    const response = await container.fetch(request);
    if (request.method === "GET") {
      const cachedResponse = responseForCache(request, response);
      if (isPublicCacheResponse(cachedResponse)) {
        ctx.waitUntil(cache.put(cacheKey, cachedResponse));
      }
    }
    return response;
  },
};
