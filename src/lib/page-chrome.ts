/**
 * Utilities for docs page chrome: breadcrumbs, copy-as-markdown, heading anchors
 */

/** Build the group name from a page path (the parent segment, titleized) */
export function getGroupName(path: string): string | null {
  const segments = path.split("/").filter(Boolean);
  if (segments.length < 2) return null;
  return titleize(segments[segments.length - 2]);
}

/** Titleize a slug segment: "getting-started" -> "Getting Started" */
export function titleize(segment: string): string {
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Convert page content to a markdown string for clipboard copy */
export function pageToMarkdown(title: string, content: string): string {
  const parts: string[] = [];
  parts.push(`# ${title}`);
  parts.push("");
  parts.push(content.trim());
  return parts.join("\n");
}

/** Slugify text for heading IDs (must match mdx-renderer.ts slugify) */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
