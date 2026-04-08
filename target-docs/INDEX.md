<!-- Source: https://mintlify.com/docs/llms.txt -->
# Mintlify Documentation Index

Full docs downloaded to `full-docs.md` via llms-full.txt (25,708 lines).
OpenAPI specs in `api-reference/` directory.

## Categories & Pages (195 total)

### Agent (AI Documentation Agent)
- agent/customize — AGENTS.md config file for controlling agent behavior
- agent/effective-prompts — Tips for writing better agent prompts
- agent/index — Overview of the AI documentation agent
- agent/linear — Connect agent to Linear for doc updates from issues
- agent/notion — Connect Notion as context source for agent
- agent/slack — Add agent to Slack workspace
- agent/use-cases — Real-world agent use case examples
- agent/workflows — Automated agent workflows (cron, webhooks)

### AI Features
- ai-native — Overview of AI-native documentation features
- ai/assistant — AI-powered chat assistant for docs sites
- ai/contextual-menu — One-click AI integrations (ChatGPT, Claude, etc.)
- ai/llmstxt — Auto-generated llms.txt and llms-full.txt files
- ai/markdown-export — Clean markdown export for AI tools
- ai/model-context-protocol — MCP server for AI tool integration
- ai/skillmd — Auto-generated skill.md for AI agents

### API Playground
- api-playground/adding-sdk-examples — Add SDK code samples (Speakeasy, Stainless)
- api-playground/asyncapi-setup — WebSocket docs via AsyncAPI
- api-playground/complex-data-types — oneOf, anyOf, allOf schemas
- api-playground/managing-page-visibility — Control which endpoints show
- api-playground/mdx-setup — Manual API pages with MDX
- api-playground/multiple-responses — Multiple response variations
- api-playground/openapi-setup — Generate docs from OpenAPI specs
- api-playground/overview — Interactive API playground overview
- api-playground/troubleshooting — Common API playground issues

### REST API
- api/introduction — API overview, auth (Bearer token), endpoints
- api/update/trigger — POST trigger deployment
- api/update/status — GET deployment status
- api/agent/v2/create-agent-job — POST create agent job
- api/agent/v2/get-agent-job — GET agent job status
- api/agent/v2/send-message — POST follow-up message to agent
- api/assistant/create-assistant-message-v2 — POST create assistant message (streaming)
- api/assistant/search — Search documentation
- api/assistant/get-page-content — GET page content by path
- api/analytics/feedback — GET user feedback
- api/analytics/feedback-by-page — GET feedback counts by page
- api/analytics/assistant-conversations — GET assistant conversation history
- api/analytics/assistant-caller-stats — GET assistant caller stats
- api/analytics/searches — GET search queries
- api/analytics/views — GET page views
- api/analytics/visitors — GET unique visitors

### CLI
- cli/analytics — View analytics from terminal
- cli/commands — Complete CLI command reference
- cli/index — CLI overview
- cli/install — Install the Mintlify CLI
- cli/preview — Local preview with live reload

### Components (MDX)
- components/index — Component library overview
- components/accordions — Collapsible content sections
- components/badge — Status indicators and labels
- components/banner — Dismissible top banner
- components/callouts — Info, warning, tip callouts
- components/cards — Navigation cards with icons
- components/code-groups — Tabbed code examples
- components/color — Color swatches
- components/columns — Multi-column grid layout
- components/examples — Right sidebar code examples
- components/expandables — Toggle nested properties
- components/fields — API parameter documentation
- components/frames — Styled image/video borders
- components/icons — Font Awesome, Lucide, Tabler icons
- components/mermaid-diagrams — Mermaid chart support
- components/panel — Right side panel customization
- components/prompt — AI prompt with copy/Cursor buttons
- components/responses — API response field docs
- components/steps — Numbered step-by-step procedures
- components/tabs — Switchable content panels
- components/tiles — Visual preview grid
- components/tooltips — Hover definitions
- components/tree — File/folder structure display
- components/update — Changelog entries
- components/view — Switchable content for languages/frameworks

### Content Creation
- create/changelogs — Product changelogs with RSS
- create/code — Code formatting and syntax highlighting
- create/files — Static file serving
- create/image-embeds — Images, YouTube, iframes
- create/list-table — Lists and tables
- create/personalization — Personalized content by user/group
- create/redirects — URL redirects
- create/reusable-snippets — Reusable MDX snippets with variables
- create/text — Text formatting (Markdown)

### Customization
- customize/custom-404-page — Custom 404 page
- customize/custom-domain — Custom domain setup
- customize/custom-scripts — Custom JS/CSS scripts
- customize/fonts — Google Fonts and self-hosted fonts
- customize/react-components — Custom React components in MDX
- customize/themes — Theme configuration (colors, dark mode)

### Dashboard
- dashboard/audit-logs — Activity audit logs (Enterprise)
- dashboard/permissions — Deployment permissions
- dashboard/roles — RBAC: admin, editor, viewer roles
- dashboard/security-contact — Security contact config
- dashboard/sso — SSO with SAML/OIDC

### Deployment
- deploy/authentication-setup — Docs auth (OAuth, JWT, password)
- deploy/ci — CI/CD quality checks
- deploy/cloudflare — Cloudflare Workers subpath hosting
- deploy/csp-configuration — Content Security Policy headers
- deploy/deployments — Deployment management
- deploy/docs-subpath — Subpath hosting overview
- deploy/export — Offline zip export
- deploy/ghes — GitHub Enterprise Server
- deploy/github — GitHub integration
- deploy/gitlab — GitLab integration
- deploy/monorepo — Monorepo configuration
- deploy/preview-deployments — PR preview URLs
- deploy/reverse-proxy — Nginx/Apache/Caddy reverse proxy
- deploy/route53-cloudfront — AWS Route 53 + CloudFront
- deploy/vercel — Vercel rewrites
- deploy/vercel-external-proxies — External proxies with Vercel

### Web Editor
- editor/collaborate — Branches, PRs, collaboration
- editor/comments — Inline comments
- editor/configurations — Visual config sheets
- editor/git-essentials — Git concepts for editor users
- editor/index — Web editor overview
- editor/inline-ai — AI-assisted editing
- editor/keyboard-shortcuts — Keyboard shortcuts
- editor/live-preview — Real-time preview
- editor/media — Media upload and management
- editor/navigation — Visual navigation editor
- editor/pages — Page creation and management
- editor/publish — Publishing workflow
- editor/suggestions — Text change suggestions

### Guides
- guides/accessibility — WCAG accessibility
- guides/assistant-embed — Tutorial: in-app assistant
- guides/automate-agent — Tutorial: auto-update docs
- guides/branches — Working with branches
- guides/claude-code — Claude Code integration
- guides/configure-automerge — GitHub automerge setup
- guides/content-templates — MDX content templates
- guides/content-types — Content type guide
- guides/cursor — Cursor IDE integration
- guides/custom-frontend — Headless docs with Astro
- guides/custom-layouts — Custom page layouts
- guides/developer-documentation — Developer docs guide
- guides/geo — AI search engine optimization
- guides/git-concepts — Git fundamentals
- guides/improving-docs — Analytics-driven improvement
- guides/index — Guides overview
- guides/internationalization — Multi-language docs
- guides/knowledge-base — Internal knowledge base
- guides/linking — Internal linking
- guides/maintenance — Content maintenance
- guides/media — Media best practices
- guides/migrating-from-mdx — MDX to OpenAPI migration
- guides/navigation — Navigation design
- guides/seo — SEO optimization
- guides/style-and-tone — Writing style guide
- guides/support-center — Self-service support center
- guides/understand-your-audience — Audience analysis
- guides/windsurf — Windsurf IDE integration

### Integrations
- integrations/analytics/* — 18 analytics integrations (GA4, Mixpanel, PostHog, Amplitude, etc.)
- integrations/privacy/osano — Osano cookie consent
- integrations/sdks/speakeasy — Speakeasy SDK examples
- integrations/sdks/stainless — Stainless SDK examples
- integrations/support/front — Front chat widget
- integrations/support/intercom — Intercom chat widget

### Migration
- migration — Migrate from Docusaurus, ReadMe, GitBook

### Optimization
- optimize/analytics — Dashboard analytics
- optimize/feedback — User feedback widgets
- optimize/pdf-exports — PDF export
- optimize/seo — SEO settings

### Organization
- organize/hidden-pages — Hidden page configuration
- organize/mintignore — .mintignore file exclusions
- organize/navigation — docs.json navigation config
- organize/pages — Page frontmatter metadata
- organize/settings — Global docs.json settings
- organize/settings-api — API settings in docs.json
- organize/settings-appearance — Appearance/branding
- organize/settings-integrations — Integration settings
- organize/settings-reference — Complete docs.json schema
- organize/settings-seo — SEO settings in docs.json
- organize/settings-structure — Site structure settings

### Getting Started
- quickstart — Deploy docs in minutes, first content change
- what-is-mintlify — Platform overview
- index — Documentation home page

### OpenAPI Specs
- openapi.json — Main external API spec
- analytics.openapi.json — Analytics API spec
- discovery-openapi.json — Discovery API spec
- admin-openapi.json — Admin API spec
- asyncapi.yaml — AsyncAPI (WebSocket) spec
