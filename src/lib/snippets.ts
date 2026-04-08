/**
 * snippets.ts — Reusable snippet resolution and variable substitution.
 *
 * Snippets are pages stored under the `snippets/` path prefix.
 * They are excluded from navigation and can be inlined into other pages
 * via the `<Snippet file="snippets/path" />` component.
 *
 * Variables use `{{variableName}}` syntax and are resolved from
 * frontmatter, project config, or a provided variables map.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface SnippetPage {
  path: string;
  content: string;
}

// ── Snippet Page Detection ───────────────────────────────────────────────────

/** Check if a page path belongs to the snippets directory. */
export function isSnippetPage(path: string): boolean {
  return path.startsWith("snippets/");
}

// ── Variable Resolution ──────────────────────────────────────────────────────

/**
 * Replace `{{variableName}}` (with optional whitespace) in content.
 * Variables inside fenced code blocks (``` ... ```) are left untouched.
 * Unresolved variables are left as-is.
 */
export function resolveVariables(
  content: string,
  variables: Record<string, string>,
): string {
  if (Object.keys(variables).length === 0) return content;

  // Split content into fenced code blocks and non-code segments
  const fencedCodeRegex = /(```[\s\S]*?```)/g;
  const parts = content.split(fencedCodeRegex);

  return parts
    .map((part, index) => {
      // Odd-indexed parts are fenced code blocks — skip them
      if (index % 2 === 1) return part;

      // Replace {{var}} in non-code segments
      return part.replace(
        /\{\{\s*(\w+)\s*\}\}/g,
        (match: string, varName: string) => {
          return varName in variables ? variables[varName] : match;
        },
      );
    })
    .join("");
}

// ── Snippet Resolution ───────────────────────────────────────────────────────

/**
 * Resolve `<Snippet file="snippets/path" />` tags by inlining the
 * referenced snippet page's content. Supports self-closing tags with
 * double quotes, single quotes, and optional `.mdx` extension.
 */
export function resolveSnippets(
  content: string,
  snippetPages: SnippetPage[],
): string {
  // Match <Snippet file="..." /> or <Snippet file='...' />
  const snippetRegex = /<Snippet\s+file=(?:"([^"]+)"|'([^']+)')\s*\/>/g;

  return content.replace(
    snippetRegex,
    (_match: string, doubleQuoted: string, singleQuoted: string) => {
      let filePath = doubleQuoted || singleQuoted;

      // Strip .mdx extension if present for matching
      filePath = filePath.replace(/\.mdx$/, "");

      const snippet = snippetPages.find((s) => s.path === filePath);
      if (!snippet) {
        return `<Note title="Snippet not found">Could not find snippet: ${filePath}</Note>`;
      }

      return snippet.content;
    },
  );
}

// ── Variable Extraction ──────────────────────────────────────────────────────

/**
 * Build a variables map from frontmatter and project-level config.
 * Frontmatter variables take precedence over config variables.
 */
export function buildVariablesMap(
  frontmatter?: Record<string, unknown> | null,
  projectVariables?: Record<string, string> | null,
): Record<string, string> {
  const vars: Record<string, string> = {};

  // Project-level variables (lower precedence)
  if (projectVariables) {
    for (const [key, value] of Object.entries(projectVariables)) {
      vars[key] = String(value);
    }
  }

  // Frontmatter variables (higher precedence)
  if (frontmatter?.variables && typeof frontmatter.variables === "object") {
    const fmVars = frontmatter.variables as Record<string, unknown>;
    for (const [key, value] of Object.entries(fmVars)) {
      if (value !== null && value !== undefined) {
        vars[key] = String(value);
      }
    }
  }

  return vars;
}
