# Build Spec — Mintlify Clone (namuh-mintlify)

**Status: PARTIAL** — Docs extraction complete. Site map complete. Feature deep-dives pending.

## Product Overview

Mintlify is an AI-native documentation platform. Users create organizations, connect GitHub repos containing MDX files + a `docs.json` config, and Mintlify builds/deploys beautiful documentation sites with AI-powered search, chat assistant, and an AI agent that auto-updates docs.

**Clone name**: namuh-mintlify
**Target audience**: Developer teams who need hosted documentation

### Core Value Proposition
1. Write docs in MDX → get a beautiful, searchable docs site
2. AI assistant answers user questions from your docs
3. AI agent creates PRs to keep docs updated
4. Analytics show what's working and what's not

## Tech Stack

- **Framework**: Next.js 16 App Router (pre-configured)
- **Language**: TypeScript strict mode
- **Styling**: Tailwind CSS
- **Database**: Drizzle ORM + RDS Postgres
- **Auth**: Better Auth (Google OAuth)
- **Storage**: AWS S3 (for doc assets, media uploads)
- **Container Registry**: AWS ECR
- **Dev Port**: 3015

## Site Map (verified via UI inspection 2026-04-08)

### URL Pattern
Dashboard: `dashboard.mintlify.com/{orgSlug}/{projectSlug}/...`
Docs site: `{projectSlug}.mintlify.app/...`

### Dashboard Layout
- **Sidebar** (~240px): Org/project switcher, main nav, "Agents" group, collapse button
- **Top bar**: Search (Cmd+K), notifications bell, chat button, profile avatar
- **Right panel**: Notifications inbox (slide-over)
- **Trial banner**: Shown for free-tier orgs

### Dashboard Pages
| Page | URL | Type |
|------|-----|------|
| Home | `/{org}/{project}` | Overview — greeting, project card, deployment status, activity table (Live/Previews), domain, "Things to do" |
| Editor | `/{org}/{project}/editor/main` | Rich MDX editor — Navigation/Files tree, visual+markdown modes, toolbar, live preview, publish, comments, branch selector |
| Analytics | `/{org}/{project}/analytics/v2` | Charts + tables — sub-tabs: Visitors, Views, Assistant, Searches, Feedback; Humans/Agents toggle, date range picker |

### Settings Pages
| Page | URL |
|------|-----|
| Domain setup | `/settings/deployment/custom-domain` |
| Authentication | `/settings/deployment/authentication` |
| Add-ons | `/settings/deployment/addons` |
| General | `/settings/deployment/general` |
| Git settings | `/settings/deployment/git-settings` |
| GitHub app | `/settings/organization/github-app` |
| API keys | `/settings/organization/api-keys` |
| Members | `/settings/organization/members` |
| Billing | `/settings/organization/billing` |
| My profile | `/settings/account` |
| Exports | `/settings/deployment/export-docs` |
| Danger zone | `/settings/organization/danger-zone` |

### Agents (Products) Pages
| Page | URL | Description |
|------|-----|-------------|
| Agent | `/products/agent` | Enable agent, Slack + GitHub app connections, repo permissions |
| Assistant | `/products/assistant` | Usage stats, status toggle, deflection config, search domains, starter questions; General/Billing tabs |
| Workflows | `/products/workflows` | Template picker: Changelog, API docs sync, Draft docs, Translations, Style guide, Typo check, Broken links, SEO audit, Custom |
| MCP | `/products/mcp` | Hosted MCP server URL, available tools (search + get_page) |

### Auth Pages
- `/login` — Login (Google OAuth)
- `/signup` — Signup → org creation → onboarding
- `/onboarding` — GitHub connection, project setup

### Docs Site (*.mintlify.app)
- **Top bar**: Logo, search, "Ask AI" button, Support, GitHub, Dashboard link, dark mode toggle
- **Tab nav**: Guides | API reference (configurable)
- **Left sidebar**: Navigation tree from docs.json
- **Center content**: MDX-rendered pages with components
- **Right panel**: AI Assistant chat panel (slide-over)
- **Pages**: `/` (index), `/[...slug]` (any doc page)

### Global UI Elements
- **Profile menu**: Your profile, Invite members, Billing, Theme (System/Light/Dark), Documentation, Contact support, Log Out
- **Org switcher**: Current org dropdown + "New documentation" option
- **Notifications inbox**: Slide-over with filter, empty state

## Design System (partial — needs screenshot inspection)

### Colors (from Mintlify branding — to be confirmed via UI)
- Primary: Green (#0D9373 or similar)
- Background light: White (#FFFFFF)
- Background dark: Dark gray/black
- Text: Near-black for light, near-white for dark
- Accent: Varies by theme config

### Typography (to be confirmed)
- Headings: Inter or similar sans-serif
- Body: Inter or similar
- Code: JetBrains Mono or Fira Code

### Layout (verified)
- **Dashboard**: Fixed sidebar (~240px) + scrollable main content. Sidebar has org switcher, nav groups, collapse button. Top bar has search, notifications, chat, profile.
- **Editor**: 3-panel — left (file tree/nav ~280px, resizable up to 550px), center (visual/markdown editor), right (comments/TOC)
- **Docs site**: 3-column — left sidebar nav (~260px), center content (~720px), right panel (AI assistant/TOC ~240px)
- **Settings**: Left sidebar (settings nav groups) + main content area

### Shared Components (to be built)
- Sidebar navigation with groups, pages, icons
- Top navigation bar with tabs
- Data tables (analytics, deployments, members)
- Modal dialogs
- Toast notifications
- Dropdown menus
- Form inputs with validation
- Code editor (Monaco/CodeMirror for MDX)
- Markdown/MDX renderer

## Data Models

### Organization
- id, name, slug, createdAt, updatedAt
- plan (free, pro, enterprise)
- settings (JSON)

### User
- id, email, name, avatarUrl, createdAt
- Better Auth fields (session, account)

### OrgMembership
- id, orgId, userId, role (admin/editor/viewer), createdAt

### Project (Documentation Site)
- id, orgId, name, slug
- repoUrl, repoBranch, repoPath
- customDomain, subdomain (*.mintlify.app)
- settings (JSON — docs.json equivalent)
- status (active, deploying, error)
- createdAt, updatedAt

### Deployment
- id, projectId, status (queued, in_progress, succeeded, failed)
- commitSha, commitMessage
- startedAt, endedAt, createdAt

### Page
- id, projectId, path, title, description
- content (MDX text)
- frontmatter (JSON)
- isPublished, createdAt, updatedAt

### ApiKey
- id, orgId, name, keyPrefix (mint_ or mint_dsc_)
- keyHash, type (admin/assistant)
- createdAt, lastUsedAt

### AgentJob
- id, projectId, prompt, status
- prUrl, createdAt, updatedAt

### AssistantConversation
- id, projectId, messages (JSON array)
- createdAt

### AnalyticsEvent
- id, projectId, pageId, type (view, search, feedback)
- data (JSON), createdAt

### AuditLog
- id, orgId, userId, action, details (JSON), createdAt

## Backend Architecture (AWS)

| Feature | AWS Service |
|---------|-------------|
| Database | RDS Postgres (via Drizzle ORM) |
| File storage (media, assets) | S3 |
| Container registry | ECR |
| Auth | Better Auth (self-hosted, Postgres sessions) |
| DNS/domain verification | Cloudflare API |
| Deployment builds | Local build + Docker → ECR → deploy |
| Search/AI | Postgres full-text search + OpenAI/Anthropic API |
| Analytics | Postgres aggregation queries |

## SDK / DX (TypeScript only)

No SDK package needed — Mintlify's developer tool is the CLI (`mint`).

### CLI Commands to Clone
- `mint dev` — local preview server
- `mint build` — production build
- `mint broken-links` — check for broken links
- `mint analytics` — view analytics

### REST API to Clone
- Bearer token auth (`mint_` and `mint_dsc_` prefixed keys)
- Deployment management (trigger, status)
- Agent jobs (create, get, send-message)
- Assistant (create-message with streaming, search, get-page-content)
- Analytics export (views, visitors, feedback, searches, conversations)

## Build Order

1. **P0: Infrastructure** — DB schema, S3 bucket, env config
2. **P1: Auth** — Better Auth + Google OAuth, sessions, middleware
3. **P1: Core API** — API key management, auth middleware for API routes
4. **P2: Dashboard shell** — Layout, navigation, routing
5. **P2: Project CRUD** — Create/manage documentation projects
6. **P3: Docs renderer** — MDX → HTML with component library
7. **P3: Web editor** — MDX editing with live preview
8. **P3: Deployment system** — Git webhook → build → deploy
9. **P4: AI Assistant** — Chat widget, search, content indexing
10. **P4: Analytics** — Page views, visitors, searches, feedback
11. **P5: Agent** — AI doc updater, PR creation
12. **P5: Team management** — Invite, roles, permissions
13. **P6: Integrations** — Analytics (GA4, etc.), support (Intercom)
14. **P7: CLI** — `mint dev`, `mint build`
15. **P8: Settings pages** — Theme, domain, navigation config
16. **P9: Advanced features** — CI checks, SSO, audit logs, export
17. **P10: Polish** — Onboarding flow, empty states, responsive design
18. **Last: Deployment** — Docker build, ECR push, production deploy
