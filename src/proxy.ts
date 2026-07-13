import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { getPublicAppUrl } from "@/lib/app-url";
import { isConfiguredAppHost, normalizeHostHeader } from "@/lib/domains";
import { parsePublicMarkdownExportPath } from "@/lib/public-markdown-export";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/settings",
  "/products",
  "/analytics",
];

const WORKSPACE_HOME_PATTERN = /^\/[^/]+\/[^/]+\/home$/;

function isProtectedDashboardPath(pathname: string) {
  return (
    PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    WORKSPACE_HOME_PATTERN.test(pathname)
  );
}

function shouldSkipHostRouting(pathname: string) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/custom-domain-not-found"
  );
}

async function resolveDocsSubdomainForHost(hostname: string) {
  const resolveUrl = new URL("/api/docs/resolve-host", getPublicAppUrl());
  resolveUrl.searchParams.set("host", hostname);

  try {
    const response = await fetch(resolveUrl, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { subdomain?: unknown };
    return typeof payload.subdomain === "string" && payload.subdomain
      ? payload.subdomain
      : null;
  } catch {
    return null;
  }
}

async function handleCustomDocsHost(request: NextRequest, start: number) {
  const { pathname, search } = request.nextUrl;
  if (shouldSkipHostRouting(pathname)) return null;

  const hostname = normalizeHostHeader(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );

  if (!hostname || isConfiguredAppHost(hostname)) return null;

  const subdomain = await resolveDocsSubdomainForHost(hostname);
  if (!subdomain) {
    const notFoundUrl = new URL("/custom-domain-not-found", request.url);
    const response = NextResponse.rewrite(notFoundUrl, { status: 404 });
    response.headers.set("Server-Timing", `proxy;dur=${Date.now() - start}`);
    return response;
  }

  const docsPath = pathname === "/" ? "" : pathname;
  const docsUrl = new URL(
    `/docs/${subdomain}${docsPath}${search}`,
    request.url,
  );
  const response = NextResponse.rewrite(docsUrl);
  response.headers.set("Server-Timing", `proxy;dur=${Date.now() - start}`);
  response.headers.set("X-OpenDocs-Resolved-Host", hostname);
  return response;
}

export async function proxy(request: NextRequest) {
  const start = Date.now();
  const sessionCookie = getSessionCookie(request);
  const { pathname, search } = request.nextUrl;

  const customDocsResponse = await handleCustomDocsHost(request, start);
  if (customDocsResponse) return customDocsResponse;

  const markdownExport = parsePublicMarkdownExportPath(pathname);
  if (markdownExport) {
    const markdownUrl = new URL(
      `/api/docs/${markdownExport.subdomain}/markdown/${markdownExport.pagePath}`,
      request.url,
    );
    const response = NextResponse.rewrite(markdownUrl);
    response.headers.set("Server-Timing", `proxy;dur=${Date.now() - start}`);
    return response;
  }

  // Unauthenticated users visiting protected routes or onboarding → redirect to login
  if (
    !sessionCookie &&
    (isProtectedDashboardPath(pathname) || pathname === "/onboarding")
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  const duration = Date.now() - start;

  // Set Server-Timing header for performance monitoring
  response.headers.set("Server-Timing", `proxy;dur=${duration}`);

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/:orgSlug/:projectSlug/home",
    "/settings/:path*",
    "/products/:path*",
    "/analytics/:path*",
    "/onboarding",
    "/docs/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
