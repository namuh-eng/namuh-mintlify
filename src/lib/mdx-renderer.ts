/**
 * MDX Renderer — parses MDX content to HTML, extracts custom components,
 * builds docs navigation, and resolves pages from slugs.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContentBlock {
  type: "markdown" | "component";
  tag?: string;
  content: string;
  props?: Record<string, string>;
}

export interface DocsNavItem {
  type: "item";
  label: string;
  path: string;
  pageId: string;
}

export interface DocsNavGroup {
  type: "group";
  label: string;
  items: DocsNavItem[];
}

export type DocsNavEntry = DocsNavItem | DocsNavGroup;

export interface PageData {
  id: string;
  path: string;
  title: string;
  content: string;
  isPublished: boolean;
}

// ── Markdown → HTML Renderer ──────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert inline markdown (bold, italic, code, links, images) to HTML. */
function renderInline(text: string): string {
  let result = text;

  // Images first (before links since they share similar syntax)
  result = result.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" />',
  );

  // Links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Inline code (before bold/italic to avoid conflicts)
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold + italic
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");

  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");

  return result;
}

/**
 * Parse markdown content to HTML.
 * Handles headings, paragraphs, lists, code blocks, blockquotes,
 * horizontal rules, tables, and inline formatting.
 */
export function parseMdxToHtml(content: string): string {
  if (!content.trim()) return "";

  const lines = content.split("\n");
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (fenced)
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const codeContent = escapeHtml(codeLines.join("\n"));
      const langAttr = lang ? ` data-language="${lang}"` : "";
      const langLabel = lang
        ? `<div class="code-header"><span class="code-lang">${escapeHtml(lang)}</span><button class="code-copy" title="Copy">Copy</button></div>`
        : "";
      output.push(
        `<div class="code-block"${langAttr}>${langLabel}<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ""}>${codeContent}</code></pre></div>`,
      );
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const id = slugify(text);
      output.push(
        `<h${level} id="${id}"><a href="#${id}" class="heading-anchor">${renderInline(text)}</a></h${level}>`,
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      output.push("<hr />");
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      output.push(
        `<blockquote>${renderInline(quoteLines.join("\n"))}</blockquote>`,
      );
      continue;
    }

    // Table (GFM)
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\|?\s*[-:]+[-| :]*$/.test(lines[i + 1])
    ) {
      const parseRow = (row: string): string[] =>
        row
          .split("|")
          .map((c) => c.trim())
          .filter((c) => c !== "");
      const headers = parseRow(line);
      i += 2; // skip header + separator

      let tableHtml = "<table><thead><tr>";
      for (const h of headers) {
        tableHtml += `<th>${renderInline(h)}</th>`;
      }
      tableHtml += "</tr></thead><tbody>";

      while (i < lines.length && lines[i].includes("|")) {
        const cells = parseRow(lines[i]);
        tableHtml += "<tr>";
        for (const c of cells) {
          tableHtml += `<td>${renderInline(c)}</td>`;
        }
        tableHtml += "</tr>";
        i++;
      }

      tableHtml += "</tbody></table>";
      output.push(tableHtml);
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^[-*+]\s+/, ""));
        i++;
      }
      const items = listItems
        .map((item) => `<li>${renderInline(item)}</li>`)
        .join("");
      output.push(`<ul>${items}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      const items = listItems
        .map((item) => `<li>${renderInline(item)}</li>`)
        .join("");
      output.push(`<ol>${items}</ol>`);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph — collect contiguous non-empty lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !lines[i].startsWith("> ") &&
      !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      output.push(`<p>${renderInline(paraLines.join("\n"))}</p>`);
    }
  }

  return output.join("\n");
}

// ── Component Block Extraction ────────────────────────────────────────────────

/** Known top-level custom components that can appear in MDX content. */
const KNOWN_COMPONENTS = new Set([
  "Note",
  "Warning",
  "Tip",
  "Info",
  "Check",
  "Card",
  "CardGroup",
  "Steps",
  "Step",
  "Tabs",
  "Tab",
  "Accordion",
  "AccordionGroup",
  "CodeGroup",
  "Frame",
  "Columns",
  "Column",
  "Dropdown",
]);

/** Known wrapper components that contain other components. */
const WRAPPER_COMPONENTS = new Set([
  "CardGroup",
  "Steps",
  "Tabs",
  "AccordionGroup",
  "CodeGroup",
  "Columns",
]);

/** Parse JSX-like props from an opening tag string. */
function parseProps(tagStr: string): Record<string, string> {
  const props: Record<string, string> = {};
  // Match attribute="value" or attribute='value' or attribute={value}
  const attrRegex = /(\w+)=(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/g;
  let match: RegExpExecArray | null = attrRegex.exec(tagStr);
  while (match) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    props[key] = value;
    match = attrRegex.exec(tagStr);
  }
  return props;
}

/**
 * Extract MDX component blocks from content, splitting into markdown and component segments.
 * Handles nested components (e.g., CardGroup > Card).
 */
export function extractComponentBlocks(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = content.split("\n");
  let i = 0;
  let markdownBuffer: string[] = [];

  function flushMarkdown() {
    const text = markdownBuffer.join("\n").trim();
    if (text) {
      blocks.push({ type: "markdown", content: text });
    }
    markdownBuffer = [];
  }

  while (i < lines.length) {
    const line = lines[i];

    // Self-closing component: <Frame caption="Screenshot" />
    const selfClosingMatch = line.match(/^<(\w+)([^>]*)\s*\/>\s*$/);
    if (selfClosingMatch && KNOWN_COMPONENTS.has(selfClosingMatch[1])) {
      flushMarkdown();
      const tag = selfClosingMatch[1];
      const props = parseProps(selfClosingMatch[2] || "");
      blocks.push({ type: "component", tag, content: "", props });
      i++;
      continue;
    }

    // Opening tag of a known component
    const openMatch = line.match(/^<(\w+)([^>]*)>\s*$/);
    if (openMatch && KNOWN_COMPONENTS.has(openMatch[1])) {
      flushMarkdown();
      const tag = openMatch[1];
      const props = parseProps(openMatch[2] || "");
      const isWrapper = WRAPPER_COMPONENTS.has(tag);

      // Find the matching closing tag
      const closingTag = `</${tag}>`;
      const contentLines: string[] = [];
      let depth = 1;
      i++;

      while (i < lines.length && depth > 0) {
        const currentLine = lines[i];
        // Check for nested same-tag opens
        if (
          new RegExp(`^<${tag}[\\s>]`).test(currentLine) &&
          !currentLine.includes("/>")
        ) {
          depth++;
        }
        if (currentLine.trim() === closingTag) {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
        contentLines.push(currentLine);
        i++;
      }

      blocks.push({
        type: "component",
        tag,
        content: contentLines.join("\n").trim(),
        props,
      });
      continue;
    }

    // Regular markdown line
    markdownBuffer.push(line);
    i++;
  }

  flushMarkdown();
  return blocks;
}

// ── Component Block Rendering ─────────────────────────────────────────────────

/** Render a single component block to HTML. */
export function renderComponentBlock(block: ContentBlock): string {
  if (block.type === "markdown") {
    return parseMdxToHtml(block.content);
  }

  const tag = block.tag || "";
  const content = block.content;
  const props = block.props || {};

  switch (tag) {
    // Callouts
    case "Note":
    case "Info":
      return `<div class="callout callout-note"><div class="callout-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div><div class="callout-content">${parseMdxToHtml(content)}</div></div>`;

    case "Warning":
      return `<div class="callout callout-warning"><div class="callout-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div><div class="callout-content">${parseMdxToHtml(content)}</div></div>`;

    case "Tip":
    case "Check":
      return `<div class="callout callout-tip"><div class="callout-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="callout-content">${parseMdxToHtml(content)}</div></div>`;

    // Card
    case "Card": {
      const title = props.title || "";
      const href = props.href || "";
      const icon = props.icon || "";
      const inner = `<div class="card-content">${icon ? `<div class="card-icon">${escapeHtml(icon)}</div>` : ""}<h3 class="card-title">${escapeHtml(title)}</h3><div class="card-body">${parseMdxToHtml(content)}</div></div>`;
      if (href) {
        return `<a href="${escapeHtml(href)}" class="card card-link">${inner}</a>`;
      }
      return `<div class="card">${inner}</div>`;
    }

    // CardGroup
    case "CardGroup": {
      const cols = props.cols || "2";
      // Extract nested Cards
      const nestedBlocks = extractComponentBlocks(content);
      const cardsHtml = nestedBlocks
        .map((b) => renderComponentBlock(b))
        .join("");
      return `<div class="card-group" style="grid-template-columns: repeat(${escapeHtml(cols)}, 1fr)">${cardsHtml}</div>`;
    }

    // Steps
    case "Steps": {
      const stepRegex =
        /<Step\s+title="([^"]*)"[^>]*>\s*([\s\S]*?)(?=<Step\s|$)/g;
      const steps: Array<{ title: string; content: string }> = [];
      let stepMatch = stepRegex.exec(content);
      while (stepMatch) {
        // Clean up trailing </Step> from content
        const stepContent = stepMatch[2].replace(/<\/Step>/g, "").trim();
        steps.push({ title: stepMatch[1], content: stepContent });
        stepMatch = stepRegex.exec(content);
      }

      if (steps.length === 0) {
        return `<div class="steps">${parseMdxToHtml(content)}</div>`;
      }

      const stepsHtml = steps
        .map(
          (step, idx) =>
            `<div class="step"><div class="step-number">${idx + 1}</div><div class="step-content"><h3 class="step-title">${escapeHtml(step.title)}</h3><div class="step-body">${parseMdxToHtml(step.content)}</div></div></div>`,
        )
        .join("");
      return `<div class="steps">${stepsHtml}</div>`;
    }

    // Tabs
    case "Tabs": {
      const tabRegex = /<Tab\s+title="([^"]*)"[^>]*>\s*([\s\S]*?)(?=<Tab\s|$)/g;
      const tabs: Array<{ title: string; content: string }> = [];
      let tabMatch = tabRegex.exec(content);
      while (tabMatch) {
        const tabContent = tabMatch[2].replace(/<\/Tab>/g, "").trim();
        tabs.push({ title: tabMatch[1], content: tabContent });
        tabMatch = tabRegex.exec(content);
      }

      if (tabs.length === 0) {
        return `<div class="tabs">${parseMdxToHtml(content)}</div>`;
      }

      const tabHeaders = tabs
        .map(
          (tab, idx) =>
            `<button class="tab-button${idx === 0 ? " active" : ""}" data-tab="${idx}">${escapeHtml(tab.title)}</button>`,
        )
        .join("");
      const tabPanels = tabs
        .map(
          (tab, idx) =>
            `<div class="tab-panel${idx === 0 ? " active" : ""}" data-tab="${idx}">${parseMdxToHtml(tab.content)}</div>`,
        )
        .join("");
      return `<div class="tabs"><div class="tab-bar">${tabHeaders}</div><div class="tab-panels">${tabPanels}</div></div>`;
    }

    // Accordion
    case "Accordion": {
      const title = props.title || "Details";
      return `<details class="accordion"><summary class="accordion-summary">${escapeHtml(title)}</summary><div class="accordion-content">${parseMdxToHtml(content)}</div></details>`;
    }

    // AccordionGroup
    case "AccordionGroup": {
      const nestedBlocks = extractComponentBlocks(content);
      const accordionsHtml = nestedBlocks
        .map((b) => renderComponentBlock(b))
        .join("");
      return `<div class="accordion-group">${accordionsHtml}</div>`;
    }

    // CodeGroup — tabbed code blocks
    case "CodeGroup": {
      const codeBlockRegex = /```(\w+)\s*\n([\s\S]*?)```/g;
      const codeBlocks: Array<{ lang: string; code: string }> = [];
      let codeMatch = codeBlockRegex.exec(content);
      while (codeMatch) {
        codeBlocks.push({ lang: codeMatch[1], code: codeMatch[2].trim() });
        codeMatch = codeBlockRegex.exec(content);
      }

      if (codeBlocks.length === 0) {
        return `<div class="code-group">${parseMdxToHtml(content)}</div>`;
      }

      const codeHeaders = codeBlocks
        .map(
          (cb, idx) =>
            `<button class="tab-button${idx === 0 ? " active" : ""}" data-tab="${idx}">${escapeHtml(cb.lang)}</button>`,
        )
        .join("");
      const codePanels = codeBlocks
        .map(
          (cb, idx) =>
            `<div class="tab-panel${idx === 0 ? " active" : ""}" data-tab="${idx}"><pre><code class="language-${escapeHtml(cb.lang)}">${escapeHtml(cb.code)}</code></pre></div>`,
        )
        .join("");
      return `<div class="code-group"><div class="tab-bar">${codeHeaders}</div><div class="tab-panels">${codePanels}</div></div>`;
    }

    // Frame
    case "Frame": {
      const caption = props.caption || "";
      return `<figure class="frame">${parseMdxToHtml(content)}${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}</figure>`;
    }

    // Columns
    case "Columns": {
      const cols = props.cols || "2";
      const nestedBlocks = extractComponentBlocks(content);
      const colsHtml = nestedBlocks
        .map((b) => renderComponentBlock(b))
        .join("");
      return `<div class="columns" style="grid-template-columns: repeat(${escapeHtml(cols)}, 1fr)">${colsHtml}</div>`;
    }

    case "Column":
      return `<div class="column">${parseMdxToHtml(content)}</div>`;

    case "Dropdown": {
      const title = props.title || "Details";
      return `<details class="accordion"><summary class="accordion-summary">${escapeHtml(title)}</summary><div class="accordion-content">${parseMdxToHtml(content)}</div></details>`;
    }

    default:
      return parseMdxToHtml(content);
  }
}

/**
 * Render full MDX content (markdown + components) to HTML.
 * First extracts component blocks, then renders each segment.
 */
export function renderMdxContent(content: string): string {
  const blocks = extractComponentBlocks(content);
  return blocks.map((block) => renderComponentBlock(block)).join("\n");
}

// ── Docs Navigation Builder ───────────────────────────────────────────────────

/**
 * Build a navigation structure from a flat list of pages.
 * Groups pages by their first path segment.
 * Root-level pages become items; pages with path segments become groups.
 */
export function buildDocsNav(
  pageList: Array<{ id: string; path: string; title: string }>,
): DocsNavEntry[] {
  if (pageList.length === 0) return [];

  const rootItems: DocsNavItem[] = [];
  const groups = new Map<string, DocsNavItem[]>();

  for (const page of pageList) {
    const segments = page.path.split("/");

    if (segments.length === 1) {
      rootItems.push({
        type: "item",
        label: page.title,
        path: page.path,
        pageId: page.id,
      });
    } else {
      const groupName = segments[0];
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      const groupItems = groups.get(groupName);
      if (groupItems) {
        groupItems.push({
          type: "item",
          label: page.title,
          path: page.path,
          pageId: page.id,
        });
      }
    }
  }

  const nav: DocsNavEntry[] = [];

  // Root items first
  for (const item of rootItems) {
    nav.push(item);
  }

  // Then groups
  for (const [groupName, items] of groups) {
    const label =
      groupName.charAt(0).toUpperCase() + groupName.slice(1).replace(/-/g, " ");
    nav.push({
      type: "group",
      label,
      items: items.sort((a, b) => a.path.localeCompare(b.path)),
    });
  }

  return nav;
}

// ── Page Resolver ─────────────────────────────────────────────────────────────

/**
 * Resolve a page from slug segments against a list of pages.
 * By default only returns published pages.
 */
export function resolvePageFromSlug(
  slugSegments: string[],
  pageList: PageData[],
  includeUnpublished = false,
): PageData | undefined {
  if (slugSegments.length === 0) return undefined;
  const targetPath = slugSegments.join("/").toLowerCase();
  return pageList.find(
    (p) => p.path === targetPath && (includeUnpublished || p.isPublished),
  );
}
