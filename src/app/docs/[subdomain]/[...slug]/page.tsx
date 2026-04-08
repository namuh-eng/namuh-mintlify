import { ApiPlayground } from "@/components/docs/api-playground";
import { ApiReferenceLayout } from "@/components/docs/api-reference-layout";
import { ChatWidget } from "@/components/docs/chat-widget";
import { CustomCodeInjection } from "@/components/docs/custom-code-injection";
import { DocsFooter } from "@/components/docs/docs-footer";
import { DocsPagination } from "@/components/docs/docs-pagination";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsToc } from "@/components/docs/docs-toc";
import { DocsTopbar } from "@/components/docs/docs-topbar";
import { FeedbackWidget } from "@/components/docs/feedback-widget";
import { MdxContent } from "@/components/docs/mdx-content";
import { MobileSidebar } from "@/components/docs/mobile-nav";
import {
  HeadingAnchors,
  PageHeaderActions,
} from "@/components/docs/page-chrome";
import { SearchModal } from "@/components/docs/search-modal";
import { renderApiReferencePage } from "@/lib/api-reference";
import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";
import { findRedirect, mergeDocsConfig } from "@/lib/docs-config";
import { getFooterSettings } from "@/lib/docs-footer";
import { extractToc } from "@/lib/editor";
import { buildDocsNav, renderMdxContent } from "@/lib/mdx-renderer";
import {
  type VirtualApiPage,
  type VirtualAsyncApiPage,
  findVirtualAsyncApiPage,
  findVirtualPage,
  generateAsyncApiPages,
  generateVirtualPages,
  isAsyncApiSpec,
  renderAsyncApiChannelPage,
} from "@/lib/openapi";
import {
  type OpenApiEndpoint,
  parseOpenApiSpec,
  renderApiPlaygroundHtml,
} from "@/lib/openapi-parser";
import { getGroupName } from "@/lib/page-chrome";
import { buildPageMetadata } from "@/lib/seo";
import {
  buildVariablesMap,
  resolveSnippets,
  resolveVariables,
} from "@/lib/snippets";
import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

interface DocsPageProps {
  params: Promise<{ subdomain: string; slug: string[] }>;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3015";

export async function generateMetadata({
  params,
}: DocsPageProps): Promise<Metadata> {
  const { subdomain, slug } = await params;
  const targetPath = slug.join("/").toLowerCase();

  const projectResult = await db
    .select({
      id: projects.id,
      name: projects.name,
      settings: projects.settings,
    })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (projectResult.length === 0) return {};

  const project = projectResult[0];
  const docsSettings = (project.settings || {}) as Record<string, unknown>;
  const docsConfig = mergeDocsConfig(
    docsSettings.docsConfig as Partial<Record<string, unknown>> | undefined,
  );

  const pageResult = await db
    .select({
      title: pages.title,
      description: pages.description,
      path: pages.path,
      frontmatter: pages.frontmatter,
      updatedAt: pages.updatedAt,
      isPublished: pages.isPublished,
    })
    .from(pages)
    .where(
      and(
        eq(pages.projectId, project.id),
        eq(pages.path, targetPath),
        eq(pages.isPublished, true),
      ),
    )
    .limit(1);

  if (pageResult.length === 0) return {};

  const page = pageResult[0];
  const meta = buildPageMetadata(
    {
      path: page.path,
      title: page.title,
      description: page.description,
      updatedAt: page.updatedAt,
      frontmatter: page.frontmatter,
      isPublished: page.isPublished,
    },
    project.name,
    APP_URL,
    subdomain,
    docsConfig.advanced.seoTitle,
    docsConfig.advanced.seoDescription,
  );

  const metadata: Metadata = {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
  };

  if (meta.noindex) {
    metadata.robots = { index: false, follow: false };
  }

  if (meta.ogImage) {
    metadata.openGraph = {
      title: meta.title,
      description: meta.description,
      images: [{ url: meta.ogImage }],
    };
  } else {
    metadata.openGraph = {
      title: meta.title,
      description: meta.description,
    };
  }

  return metadata;
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { subdomain, slug } = await params;
  const targetPath = slug.join("/").toLowerCase();

  // Find project
  const projectResult = await db
    .select({
      id: projects.id,
      name: projects.name,
      subdomain: projects.subdomain,
      settings: projects.settings,
    })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (projectResult.length === 0) {
    notFound();
  }

  const project = projectResult[0];

  // Fetch all published pages
  const allPages = await db
    .select({
      id: pages.id,
      path: pages.path,
      title: pages.title,
      description: pages.description,
      content: pages.content,
      frontmatter: pages.frontmatter,
      isPublished: pages.isPublished,
    })
    .from(pages)
    .where(and(eq(pages.projectId, project.id), eq(pages.isPublished, true)))
    .orderBy(pages.path);

  // Check for redirects before looking up the page
  const docsSettings = (project.settings || {}) as Record<string, unknown>;
  const docsConfig = mergeDocsConfig(
    docsSettings.docsConfig as Partial<Record<string, unknown>> | undefined,
  );
  const redirectDest = findRedirect(docsConfig.advanced.redirects, targetPath);
  if (redirectDest) {
    // Normalize destination: ensure it forms a valid docs path
    const dest = redirectDest.replace(/^\/+/, "");
    permanentRedirect(`/docs/${subdomain}/${dest}`);
  }

  // ── OpenAPI/AsyncAPI virtual pages ────────────────────────────────────────
  const settings = (project.settings || {}) as Record<string, unknown>;
  const spec = settings.openApiSpec as Record<string, unknown> | undefined;
  let virtualPages: VirtualApiPage[] = [];
  let asyncPages: VirtualAsyncApiPage[] = [];

  if (spec && typeof spec === "object") {
    if (isAsyncApiSpec(spec)) {
      asyncPages = generateAsyncApiPages(spec);
    } else {
      virtualPages = generateVirtualPages(spec);
    }
  }

  // Find the current page — check DB first, then virtual pages
  const currentPage = allPages.find((p) => p.path === targetPath);
  const virtualPage = findVirtualPage(virtualPages, targetPath);
  const asyncPage = findVirtualAsyncApiPage(asyncPages, targetPath);

  if (!currentPage && !virtualPage && !asyncPage) {
    notFound();
  }

  // Build navigation (pass frontmatter for API method badges in sidebar)
  const navPages = allPages.map((p) => ({
    id: p.id,
    path: p.path,
    title: p.title,
    frontmatter: p.frontmatter as Record<string, unknown> | null,
  }));

  // Add virtual pages to nav as virtual entries with apiMethod for badges
  for (const vp of virtualPages) {
    // Don't add if a DB page already exists for this path
    if (!allPages.some((p) => p.path === vp.path)) {
      navPages.push({
        id: vp.id,
        path: vp.path,
        title: vp.title,
        frontmatter: { api: `${vp.method} ${vp.endpoint.path}` },
      });
    }
  }
  for (const ap of asyncPages) {
    if (!allPages.some((p) => p.path === ap.path)) {
      navPages.push({
        id: ap.id,
        path: ap.path,
        title: ap.title,
        frontmatter: { api: `HOOK ${ap.channel.name}` },
      });
    }
  }

  const nav = buildDocsNav(navPages);

  // ── Rendering ─────────────────────────────────────────────────────────────
  const footerSettings = getFooterSettings(settings);
  let renderedHtml = "";
  let apiPlaygroundHtml = "";
  let apiReferenceHtml = "";
  let pageTitle = "";
  let pageDescription = "";
  let pageContent = "";

  if (asyncPage && !currentPage) {
    // Render auto-generated AsyncAPI channel page
    pageTitle = asyncPage.title;
    pageDescription = asyncPage.description;
    apiReferenceHtml = renderAsyncApiChannelPage(asyncPage);
  } else if (virtualPage && !currentPage) {
    // Render auto-generated OpenAPI endpoint page
    pageTitle = virtualPage.title;
    pageDescription = virtualPage.description;
    apiReferenceHtml = renderApiReferencePage(virtualPage.endpoint);
    if (docsConfig.apiDocs.playgroundEnabled) {
      apiPlaygroundHtml = renderApiPlaygroundHtml(virtualPage.endpoint);
    }
  } else if (currentPage) {
    // Render DB page (existing behavior)
    pageTitle = currentPage.title;
    pageDescription = currentPage.description || "";
    pageContent = currentPage.content || "";

    // Resolve snippets and variables before rendering
    const snippetPages = allPages
      .filter((p) => p.path.startsWith("snippets/"))
      .map((p) => ({ path: p.path, content: p.content || "" }));

    const projectVars = (docsConfig as unknown as Record<string, unknown>)
      .variables as Record<string, string> | undefined;
    const variables = buildVariablesMap(
      currentPage.frontmatter as Record<string, unknown> | null,
      projectVars,
    );

    let contentToRender = pageContent;
    contentToRender = resolveSnippets(contentToRender, snippetPages);
    contentToRender = resolveVariables(contentToRender, variables);
    renderedHtml = renderMdxContent(contentToRender);

    // Check if this DB page also matches an OpenAPI endpoint
    const isApiReferencePage = targetPath.startsWith("api-reference");
    if (isApiReferencePage && spec) {
      const endpoints = parseOpenApiSpec(spec);
      const frontmatter = (currentPage.frontmatter || {}) as Record<
        string,
        unknown
      >;
      const apiMethod = (frontmatter.api as string) || "";
      const matchedEndpoints: OpenApiEndpoint[] = [];

      if (apiMethod) {
        const [method, ...pathParts] = apiMethod.split(" ");
        const apiPath = pathParts.join(" ");
        const found = endpoints.find(
          (e) => e.method === method?.toUpperCase() && e.path === apiPath,
        );
        if (found) matchedEndpoints.push(found);
      }

      if (matchedEndpoints.length > 0) {
        apiPlaygroundHtml = matchedEndpoints
          .map((ep) => renderApiPlaygroundHtml(ep))
          .join("\n");
        apiReferenceHtml = matchedEndpoints
          .map((ep) => renderApiReferencePage(ep))
          .join("\n");
      }
    }
  }

  // Extract TOC from raw content
  const toc = extractToc(pageContent);

  // Build flat list of all pages (DB + virtual) for prev/next
  const allNavPaths = navPages.map((p) => ({ path: p.path, title: p.title }));
  const currentIdx = allNavPaths.findIndex((p) => p.path === targetPath);
  const prevPage =
    currentIdx > 0
      ? {
          path: allNavPaths[currentIdx - 1].path,
          title: allNavPaths[currentIdx - 1].title,
        }
      : null;
  const nextPage =
    currentIdx < allNavPaths.length - 1
      ? {
          path: allNavPaths[currentIdx + 1].path,
          title: allNavPaths[currentIdx + 1].title,
        }
      : null;

  // Get group name for breadcrumb
  const groupName = getGroupName(targetPath);

  // Build searchable pages list (DB + virtual)
  const searchablePages = allNavPaths;

  return (
    <div className="docs-layout">
      <DocsTopbar
        projectName={project.name}
        subdomain={subdomain}
        settings={project.settings as Record<string, unknown>}
      />

      <SearchModal pages={searchablePages} subdomain={subdomain} />
      <MobileSidebar
        nav={nav}
        activePath={targetPath}
        subdomain={subdomain}
        projectName={project.name}
      />

      <div className="docs-body">
        <DocsSidebar
          nav={nav}
          activePath={targetPath}
          subdomain={subdomain}
          projectName={project.name}
        />

        <main className="docs-main">
          {groupName && (
            <div className="docs-breadcrumb" data-testid="breadcrumb-group">
              {groupName}
            </div>
          )}

          <article className="docs-article">
            <div className="docs-title-row">
              <h1 className="docs-page-title" data-testid="page-title">
                {pageTitle}
              </h1>
              <PageHeaderActions
                title={pageTitle}
                content={pageContent}
                pageUrl={`/docs/${subdomain}/${targetPath}`}
              />
            </div>
            {pageDescription && (
              <p className="docs-page-description">{pageDescription}</p>
            )}

            <MdxContent html={renderedHtml} />
            {apiReferenceHtml && <ApiReferenceLayout html={apiReferenceHtml} />}
            {apiPlaygroundHtml && <ApiPlayground html={apiPlaygroundHtml} />}
            <HeadingAnchors />
            <FeedbackWidget subdomain={subdomain} pagePath={targetPath} />
          </article>

          <DocsPagination
            prev={prevPage}
            next={nextPage}
            subdomain={subdomain}
          />

          <DocsFooter
            footerSettings={footerSettings}
            projectName={project.name}
          />
        </main>

        <DocsToc entries={toc} />
      </div>

      <ChatWidget subdomain={subdomain} currentPath={targetPath} />
      <CustomCodeInjection
        customCSS={docsConfig.advanced.customCSS}
        customJS={docsConfig.advanced.customJS}
      />
    </div>
  );
}
