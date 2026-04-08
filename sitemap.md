# Mintlify Dashboard — Complete Site Map

## URL Pattern
`https://dashboard.mintlify.com/{orgSlug}/{projectSlug}/...`

## Layout
- **Sidebar** (~240px): Org/project switcher at top, main nav, "Agents" group, collapse button at bottom
- **Main content**: Top bar with search, notifications bell, chat button, profile avatar
- **Right panel**: Notifications inbox (slide-over)
- **Trial banner**: Yellow banner below sidebar on free plans

---

## 1. Home (Dashboard Root)
**URL:** `/{org}/{project}`
**Type:** Overview / Landing
**Elements:**
- Greeting ("Good evening, Ashley")
- "Things to do" expandable checklist (onboarding tasks)
- Project card: name, status badge (Live), last deployment info
- Quick actions: Visit site, deployment trigger, git commit input
- Domain section: subdomain link, "Add custom domain" link
- Activity table with tabs: Live | Previews
  - Columns: Update, Status, Changes (commit message + file count)
  - Each row clickable

## 2. Editor
**URL:** `/{org}/{project}/editor/main`
**Type:** Rich content editor (Visual + Markdown modes)
**Elements:**
- Left panel: Navigation tree / Files toggle
  - Navigation view: docs.json structure (groups, pages), drag-reorderable
  - Files view: file tree
  - "Add new" button, "Configurations" button
- Center panel: Visual MDX editor with toolbar
  - Toggle: Visual mode / Markdown mode
  - Rich text editing with Mintlify components
  - Title field, description field
- Right panel: Table of contents (auto-generated from headings)
- Top bar: Branch selector ("main"), feedback button, search, ask AI, live preview button, "Publish" button
- Comments sidebar (toggleable)
- File upload support

## 3. Analytics
**URL:** `/{org}/{project}/analytics/v2`
**Type:** Dashboard with charts and tables
**Sub-tabs:**
- **Visitors** — Visitors over time chart, top pages table, referrals table
- **Views** — Page views data
- **Assistant** — AI assistant usage stats
- **Searches** — Search query analytics
- **Feedback** — User feedback data
**Controls:**
- Humans / Agents toggle (filter by traffic type)
- Date range picker (e.g., "Apr 1 - 8")

## 4. Settings
**URL:** `/{org}/{project}/settings/...`
**Type:** Multi-section settings

### Project Settings
| Page | URL | Type | Description |
|------|-----|------|-------------|
| Domain setup | `/settings/deployment/custom-domain` | Form | Custom domain input, subdomain/subpath toggle, DNS verification |
| Authentication | `/settings/deployment/authentication` | Form | Docs site auth methods configuration |
| Add-ons | `/settings/deployment/addons` | List | Enable/disable product add-ons |
| General | `/settings/deployment/general` | Form | Project name, description, general config |

### Deployment
| Page | URL | Type | Description |
|------|-----|------|-------------|
| Git settings | `/settings/deployment/git-settings` | Form | Repository URL, branch, path configuration |
| GitHub app | `/settings/organization/github-app` | Config | GitHub app installation and repo access |

### Security & Access
| Page | URL | Type | Description |
|------|-----|------|-------------|
| API keys | `/settings/organization/api-keys` | Table + CRUD | Create/list/revoke API keys (admin `mint_` and assistant `mint_dsc_` prefixed) |

### Workspace
| Page | URL | Type | Description |
|------|-----|------|-------------|
| Members | `/settings/organization/members` | Table + CRUD | Invite/manage team members, assign roles |
| Billing | `/settings/organization/billing` | Info | Plan info, usage, upgrade options |

### Account
| Page | URL | Type | Description |
|------|-----|------|-------------|
| My profile | `/settings/account` | Form | User profile settings |

### Advanced
| Page | URL | Type | Description |
|------|-----|------|-------------|
| Exports | `/settings/deployment/export-docs` | Action | Export documentation as files |
| Danger zone | `/settings/organization/danger-zone` | Actions | Delete project/org, destructive operations |

---

## 5. Agents (Product Group)

### Agent
**URL:** `/{org}/{project}/products/agent`
**Type:** Configuration + Status
**Elements:**
- "Enable the Agent" upsell (requires plan upgrade)
- Agent settings section
- Slack workspace connection (shows connected workspace name)
- GitHub app integration (shows connected repos with branches and permissions)

### Assistant
**URL:** `/{org}/{project}/products/assistant`
**Type:** Configuration + Analytics
**Sub-tabs:** General | Billing
**Elements:**
- Monthly spend card ($0.00), renewal date
- Total questions / Answered properly / Not Answered stats
- Status toggle (Active/Inactive)
- Response Handling config:
  - Assistant Deflection toggle (redirect unanswered to support email)
  - Help button toggle
- Search Domains config (additional domains for AI context)
- Starter Questions config (suggested prompts, max 3)

### Workflows
**URL:** `/{org}/{project}/products/workflows`
**Type:** Template picker / List
**Elements:**
- "What do you want to automate?" heading
- Template cards:
  - Changelog (from merged PRs)
  - API docs sync (from OpenAPI spec changes)
  - Draft feature docs (when code ships)
  - Translations (when content changes)
  - Enforce style guide
  - Typo check
  - Broken link detection
  - SEO & metadata audit
  - Custom workflow

### MCP
**URL:** `/{org}/{project}/products/mcp`
**Type:** Info + Config
**Elements:**
- Hosted MCP server URL (e.g., `namuh.mintlify.app/mcp`)
- Copy button
- Available tools list:
  - `search_{project}` — Search knowledge base
  - `get_page_{project}` — Get full page content by path

---

## 6. Docs Site (Public-facing)
**URL:** `https://{project}.mintlify.app/...`
**Type:** Documentation site

### Layout
- **Top bar:** Logo + project name, search button ("Search..."), "Ask AI" button, Support link, GitHub link, Dashboard link, dark mode toggle
- **Tab navigation:** Guides | API reference (configurable)
- **Left sidebar:** Navigation tree from docs.json (groups + pages)
- **Center content:** MDX-rendered page content with components (Cards, Steps, etc.)
- **Right panel:** Table of contents (from headings)
- **AI Assistant:** Chat panel (slide-over from right side)
  - Text input with file upload support
  - Conversation history
  - "Responses are generated using AI" disclaimer

### Docs Site Pages (from navigation)
- Documentation (index)
- Blog
- **Getting started:** Introduction, Quickstart, Development
- **Customization:** Global Settings, Navigation
- **Writing content:** Markdown syntax, Code blocks, Images and embeds, Reusable snippets
- **AI tools:** Cursor setup, Claude Code setup, Windsurf setup
- **API reference:** (separate tab)

---

## 7. Global UI Elements

### Profile Menu (top-right avatar)
- User name + email
- Your profile → `/settings/account`
- Invite members → `/settings/organization/members`
- Billing → `/settings/organization/billing`
- Theme toggle: System / Light / Dark
- Documentation (external)
- Contact support
- Log Out

### Search (Cmd+K)
- Global search modal

### Notifications Inbox
- Slide-over panel from right
- Filter button, more options button
- "No notifications yet" empty state

### Org Switcher (sidebar top)
- Current org with dropdown
- "New documentation" option to create new project

### Chat Button
- Opens intercom-style chat

---

## Tech Stack Observations
- **Framework:** Next.js (App Router) — detected from `__next-route-announcer__`, `/_next/` asset paths
- **UI Library:** Radix UI — `radix-` prefixed IDs throughout, data-state attributes
- **Styling:** Tailwind CSS likely (common with Radix)
- **Editor:** Rich text/block editor (likely Tiptap or ProseMirror based on contenteditable blocks)
- **State:** Radix UI primitives for dropdowns, tooltips, switches
- **Auth:** Cookie-based session (dashboard.mintlify.com)
- **Hosting:** Vercel (edge, /_next/ paths)
