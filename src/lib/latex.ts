import katex from "katex";

/**
 * Render LaTeX math expressions in HTML content.
 * Converts $...$ (inline) and $$...$$ (block) delimiters to rendered KaTeX HTML.
 * Skips content inside <code>, <pre>, and <script> tags.
 */
export function renderLatex(html: string): string {
  if (!html) return html;

  // Protect code blocks and inline code from LaTeX processing
  const protectedBlocks: string[] = [];
  let protectedHtml = html.replace(
    /<(pre|code|script)[^>]*>[\s\S]*?<\/\1>/gi,
    (match) => {
      const idx = protectedBlocks.length;
      protectedBlocks.push(match);
      return `\x00PROTECTED_${idx}\x00`;
    },
  );

  // Process block math first ($$...$$) — greedy within single blocks
  protectedHtml = protectedHtml.replace(
    /\$\$([\s\S]+?)\$\$/g,
    (_match, expr: string) => {
      return renderKatex(expr.trim(), true);
    },
  );

  // Process inline math ($...$) — no newlines allowed inside inline
  // Negative lookbehind for $ to avoid matching $$ remnants
  // Negative lookbehind for \ to avoid matching escaped \$
  protectedHtml = protectedHtml.replace(
    /(?<!\$)(?<!\\)\$([^\n$]+?)\$(?!\$)/g,
    (_match, expr: string) => {
      return renderKatex(expr.trim(), false);
    },
  );

  // Restore protected blocks
  for (let i = 0; i < protectedBlocks.length; i++) {
    protectedHtml = protectedHtml.replace(
      `\x00PROTECTED_${i}\x00`,
      protectedBlocks[i],
    );
  }

  return protectedHtml;
}

/**
 * Render a single KaTeX expression to HTML.
 * Returns the original expression wrapped in an error span if rendering fails.
 */
function renderKatex(expression: string, displayMode: boolean): string {
  try {
    return katex.renderToString(expression, {
      displayMode,
      throwOnError: false,
      output: "htmlAndMathml",
      trust: false,
      strict: false,
    });
  } catch {
    const mode = displayMode ? "block" : "inline";
    const escaped = expression
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<span class="katex-error" data-mode="${mode}">${escaped}</span>`;
  }
}

/**
 * URL for the KaTeX CSS stylesheet (CDN).
 * Auto-loaded when LaTeX is enabled in project settings.
 */
export const KATEX_CSS_URL =
  "https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/katex.min.css";
