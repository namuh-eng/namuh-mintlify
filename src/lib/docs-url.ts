import { getPublicAppUrl } from "@/lib/app-url";

/**
 * URL helpers for a project's public docs site.
 *
 * When NEXT_PUBLIC_DOCS_ROOT_DOMAIN is configured, docs use its subdomains.
 * Otherwise they use the path-based route on NEXT_PUBLIC_APP_URL.
 */

/** Full docs site URL including protocol, e.g. for links and API clients. */
export function docsSiteUrl(subdomain: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_DOCS_ROOT_DOMAIN?.trim();
  if (rootDomain) {
    return `https://${subdomain}.${rootDomain.replace(/^\.+/, "")}`;
  }

  return `${getPublicAppUrl()}/docs/${subdomain}`;
}

/** Docs site URL without the protocol, for compact display in the UI. */
export function docsDisplayUrl(subdomain: string): string {
  return docsSiteUrl(subdomain).replace(/^https?:\/\//, "");
}
