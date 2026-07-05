/**
 * Custom domain utilities — validation, CNAME target generation, verification status.
 */

const DOMAIN_REGEX = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
export const HOSTING_SUFFIX = "hosting.namuh.dev";

/** Validate a custom domain string. Returns error string or null if valid. */
export function validateCustomDomain(domain: string): string | null {
  const trimmed = domain.trim();
  if (!trimmed) return "Domain is required";
  if (trimmed.length > 253) return "Domain must be at most 253 characters";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return "Enter the domain without http:// or https://";
  if (trimmed.includes("/")) return "Domain should not contain a path";
  if (!trimmed.includes("."))
    return "Domain must have at least two parts (e.g. docs.example.com)";
  if (!DOMAIN_REGEX.test(trimmed)) return "Invalid domain format";
  return null;
}

/** Generate the CNAME target that users should point their domain to. */
export function generateCnameTarget(subdomain: string): string {
  return `${subdomain}.${HOSTING_SUFFIX}`;
}

/** Determine the verification status of a custom domain. */
export function domainVerificationStatus(
  customDomain: string | null | undefined,
  verifiedAt: string | null | undefined,
): "not_configured" | "pending" | "verified" {
  if (!customDomain) return "not_configured";
  if (!verifiedAt) return "pending";
  return "verified";
}

export function normalizeHostHeader(host: string | null | undefined) {
  const firstValue = host?.split(",")[0]?.trim();
  if (!firstValue) return null;

  const withoutTrailingDot = firstValue.replace(/\.$/, "");
  const hostname = withoutTrailingDot.startsWith("[")
    ? withoutTrailingDot.slice(0, withoutTrailingDot.indexOf("]") + 1)
    : withoutTrailingDot.split(":")[0];

  const normalized = hostname?.trim().toLowerCase();
  return normalized || null;
}

export function isLocalAppHost(hostname: string | null | undefined) {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}

function configuredHostname(value: string | null | undefined) {
  if (!value) return null;
  try {
    return normalizeHostHeader(new URL(value).host);
  } catch {
    return normalizeHostHeader(value);
  }
}

export function isConfiguredAppHost(hostname: string | null | undefined) {
  if (!hostname) return false;
  if (isLocalAppHost(hostname)) return true;

  const appHostname = configuredHostname(process.env.NEXT_PUBLIC_APP_URL);
  if (appHostname && hostname === appHostname) return true;

  const docsRoot = configuredHostname(process.env.NEXT_PUBLIC_DOCS_ROOT_DOMAIN);
  return Boolean(docsRoot && hostname === docsRoot);
}

export function resolveManagedDocsSubdomain(
  hostname: string | null | undefined,
) {
  if (!hostname) return null;
  const docsRoot = configuredHostname(process.env.NEXT_PUBLIC_DOCS_ROOT_DOMAIN);
  if (!docsRoot || hostname === docsRoot) return null;
  if (!hostname.endsWith(`.${docsRoot}`)) return null;

  const subdomain = hostname.slice(0, -(docsRoot.length + 1));
  return /^[a-z0-9-]+$/.test(subdomain) ? subdomain : null;
}
