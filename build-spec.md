# Build Spec — Mintlify Clone (namuh-mintlify)

**Status: PARTIAL** — Docs extraction complete. UI inspection pending.

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

## Site Map (partial — needs UI inspection)

### Dashboard (dashboard.mintlify.com equivalent)
- `/` — Overview (deployment status, site URL, quick links)
- `/editor` — Web editor (MDX editing, live preview, comments)
- `/editor/[page]` — Edit specific page
- `/settings` — Project settings
  - `/settings/general` — Project name, description
  - `/settings/navigation` — Sidebar/nav config
  - `/settings/appearance` — Theme, colors, logo, fonts
  - `/settings/custom-domain` — Custom domain setup
  - `/settings/integrations` — Analytics, support integrations
  - `/settings/seo` — Meta tags, indexing
- `/settings/organization` — Org settings
  - `/settings/organization/members` — Team management, invite
  - `/settings/organization/roles` — RBAC
  - `/settings/organization/api-keys` — API key management
  - `/settings/organization/sso` — SSO config (Enterprise)
  - `/settings/organization/audit-logs` — Activity logs (Enterprise)
  - `/settings/organization/security-contact` — Security contact
- `/analytics` — Analytics dashboard
  - Page views, visitors, searches, feedback, assistant conversations
- `/products/agent` — Agent management
  - Agent settings, Slack/Linear/Notion connections
  - Agent jobs list, job details
- `/products/assistant` — Assistant config
- `/products/authentication` — Docs site auth config
- `/products/addons` — CI checks, add-ons
- `/deployments` — Deployment history

### Auth Pages
- `/login` — Login (Google OAuth, email)
- `/signup` — Signup → org creation → onboarding
- `/onboarding` — GitHub connection, project setup

### Docs Site (*.mintlify.app equivalent)
- `/` — Docs homepage
- `/[...slug]` — Rendered MDX pages
- `/api-playground` — Interactive API testing
- Built-in search + AI assistant widget

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

### Layout
- Dashboard: Sidebar navigation + main content area
- Docs site: Left sidebar nav + center content + optional right panel
- Editor: Sidebar file tree + editor + live preview split

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
