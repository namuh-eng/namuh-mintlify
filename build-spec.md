# Build Spec — Mintlify Clone (namuh-mintlify)

**Status: PARTIAL** — Docs extraction complete. Site map complete. All dashboard pages inspected. Docs site deep dive pending.

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
| Analytics | `/{org}/{project}/analytics/v2` | Charts + tables — see Analytics Deep Dive below |

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

## Design System (partial — updated with Home page inspection)

### Colors (confirmed from dark mode UI)
- Primary/Brand: Green (#0D9373 / similar — used for "Live" badge, success states, active nav items, checkmarks)
- Success: Green (same as primary — deployment "Successful" badge)
- Warning/Updating: Orange/amber — used for "Updating" status badge
- Error/Failed: Red — used for "Failed" status badge
- Background dark: Very dark gray (#0f0f0f or similar)
- Surface dark: Slightly lighter gray (#1a1a1a) — card backgrounds, sidebar
- Surface elevated: Medium gray (#2a2a2a) — activity table rows, inputs
- Text primary: White/near-white
- Text secondary: Gray (#888 or similar) — timestamps, descriptions
- Accent: Orange — trial banner warning
- Badge backgrounds: Semi-transparent colored fills with matching text

### Typography (confirmed)
- Headings: Sans-serif (Inter or system font), normal weight for greeting, medium for section titles
- Body: Same sans-serif, regular weight
- Code: Monospace — commit SHAs, file paths
- Timestamps: Relative format ("3 days ago", "just now") with absolute tooltip

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
- Status badges (Live/Updating/Successful/Failed — colored pill badges)
- Expandable/collapsible sections (accordion pattern — "Things to do", deployment rows)
- Tab switcher (pill-style tabs — "Live" / "Previews")
- Org switcher dropdown (sidebar header)
- Profile menu dropdown (avatar → menu items)
- Search modal (Cmd+K, full overlay with text input)
- Site preview thumbnail card (with status overlay during deploys)

## Page Deep Dives

### Home Page (Dashboard Root) — COMPLETE
**URL**: `/{org}/{project}`
**Layout**: Full-width content area with greeting header, project card, activity section

#### Sections (top to bottom):
1. **Trial banner** (top): Yellow/amber banner — "Your team is on a free trial. Trial ends on {date}." + "Explore upgrades" link → billing settings
2. **Greeting**: "Good {timeOfDay}, {firstName}" — dynamically changes based on time
3. **"Things to do" dropdown** (top-right): Collapsible accordion with onboarding checklist
   - Header: "Things to do" with expand/collapse arrow
   - Expanded shows: "Complete your setup — Here are the remaining todos"
   - Checklist items with arrows: "Make an update", "Add custom domain"
   - Each item is clickable → navigates to relevant page
4. **Project card**: Left side = site preview thumbnail (auto-generated screenshot of live site), Right side = info
   - Project name ("Mint Starter Kit")
   - Status badge: "Live" (green), "Updating" (orange)
   - Last update info: "Initializing Project · 3 days ago" or "Last updated just now by Manual Update"
   - **3 action buttons** (icon row):
     - Edit (pencil icon) → navigates to `/editor/main`
     - Deploy (circular arrow icon, type=submit) → triggers manual deployment, changes status to "Updating"
     - "Visit site" (with icon) → opens docs site in new tab
5. **Domain section**:
   - Subdomain link: `{project}.mintlify.app` (clickable, opens in new tab with external link icon)
   - "Add custom domain" link → navigates to settings
6. **Activity section**:
   - Tab switcher: "Live" | "Previews" (pill-style buttons)
   - **Live tab**: Table with columns: Update, Status, Changes
     - Each row: deployment icon + name + relative timestamp | status badge (Successful/Updating/Failed) | commit message + file count
     - Rows are **expandable** (click chevron to expand)
     - **Expanded row** shows two columns:
       - Left: "Update successful" + live URL link, "Commit details" (source ref link, commit SHA link), "Files changed" (list of file paths, each linking to GitHub commit)
       - Right: "Deployment log" — sequential step-by-step log with green checkmarks for each step
     - Deployment log steps include: Verified permissions, Fetching config, Validating docs.json, Fetching files, Updating paths, Saving config, Navigation update, Search indexing, Page revalidation, Cache update
   - **Previews tab**: Table with columns: Update, Branch, Status, Changes
     - "+ Create custom preview" button at top
     - Shows preview deployments from branches
     - Rows same expandable pattern as Live tab

#### Behaviors observed:
- Triggering deploy: Click deploy button → status instantly changes to "Updating" → new activity row appears at top → status updates to "Successful" after ~30s
- Time display: Relative format ("3 days ago", "just now") with absolute date in title tooltip
- Project thumbnail: Shows auto-generated screenshot of the live docs site, overlaid with "Updating" spinner during deploys
- Deployment expand: Accordion-style with chevron animation
- Files changed links: Each links to the specific commit on GitHub
- Commit details: Source shows branch, commit shows abbreviated SHA — both link to GitHub

#### Global UI (confirmed from Home page):
- **Org switcher**: Sidebar header button → dropdown with: current org (checkmark), "+ New documentation"
- **Profile menu**: Avatar button (top-right) → dropdown with: name+email, Your profile, Invite members, Billing, Theme (System/Light/Dark toggle buttons), Documentation, Contact support, Log Out
- **Search modal**: Cmd+K or search button → full overlay with "What are you looking for?..." input + ESC button
- **Notifications inbox**: Bell icon → slide-over panel from right: filter button, more options, "No notifications yet" empty state

### Editor Page — COMPLETE
**URL**: `/{org}/{project}/editor/main`
**Layout**: 3-panel — left sidebar (nav/files tree, ~280px resizable 280-550px), center (visual/markdown editor), right (TOC + comments)

#### Top Toolbar (left to right):
1. **Undo/Redo buttons** — unlabeled icon buttons
2. **Visual mode / Markdown mode** toggle — two sets of toggle buttons (one for each mode pair)
3. **Branch selector** — button showing current branch ("main"), opens popover with:
   - Search/filter input ("Find a branch")
   - Branch list with "Default" badge on main branch
   - "+ Create new branch" button
4. **Send feedback** — icon button
5. **Toolbar icon buttons** — (unlabeled, likely: format, page settings, etc.)
6. **Search** — icon button
7. **Ask AI** — icon button, opens right sidebar panel (premium upsell: "Enable the Agent" for free tier)
8. **Live Preview** — toggle button, shows rendered docs preview in content area
9. **Publish** — dropdown button, shows popover with:
   - Site URL (e.g., namuh.mintlify.app)
   - "Publish" button (disabled when no changes)

#### Left Panel — Navigation View:
- Toggle: **Navigation** | **Files** tabs
- **Navigation view**: Shows docs.json structure
  - Top-level items: Documentation (external link), Blog (external link), Guides
  - Grouped sections: Getting started (index, quickstart, development), Customization, Writing content, AI tools, API reference
  - Each group has expand/collapse toggle
  - Each page is clickable → loads in editor; double-click or specific action opens page settings
  - "Add new" dropdown at bottom with options:
    - **Add**: Tab
    - **Wrap with**: Dropdown, Anchor, Language, Product, Version
  - Context menu on items (right-click) for rename, delete, move, etc.
- **Files view**: Shows Git repo file tree
  - Directories: ai-tools, api-reference, essentials, images, logo, snippets
  - Files: .mintignore, AGENTS.md, CONTRIBUTING.md, development.mdx, docs.json, favicon.svg, index.mdx, LICENSE, quickstart.mdx, README.md
  - Each directory has "Add to {dir}" button
  - "Add new" dropdown at bottom
- **Configurations** button at very bottom → opens full config panel (see below)

#### Center Panel — Visual Editor:
- **Title** textarea (shadow DOM): "New Page Title" placeholder
- **Description** textarea (shadow DOM): "Add a description" placeholder
- **Content area**: Rich text visual editor (likely Tiptap/ProseMirror-based)
  - Renders MDX components visually: Cards, CardGroups (Columns), Callouts, Steps, Code blocks, etc.
  - "+" block insertion handle appears left of blocks on hover
  - Card components have "Edit Card attributes" button on each card
  - "Add more to Columns" button to add cards to a CardGroup
  - Code blocks have collapsible ranges (fold/unfold)
  - Content is contenteditable with custom block types
- **Markdown mode**: Full code editor with:
  - Line numbers
  - MDX syntax highlighting (frontmatter, headings, JSX tags, attributes)
  - Monospace font
  - Shows raw MDX source including frontmatter (title, description) and component tags

#### Right Panel:
- **Table of Contents**: Auto-generated from headings (e.g., "Setting up", "Make it yours", "Create beautiful pages", "Need inspiration?")
  - Each heading is clickable → scrolls to section
- **Comments sidebar**: Toggle-able panel
  - "This page" filter dropdown
  - "Close comments sidebar" button
  - "Select text in the editor to add a comment" instruction

#### Page Settings (popover/dialog):
Triggered by clicking on a page in the navigation tree:
- **Title**: text input (e.g., "Introduction")
- **Slug**: text input (e.g., "index")
- **External URL**: text input
- **Description**: text input
- **Icon**: icon picker with preview
- **Sidebar title**: text input (override display name in nav)
- **OG Image URL**: text input (auto generated by default)
- **Tag**: toggle (On/Off)
- **Hidden**: toggle (Yes/No)
- **Keywords**: "+ Add keyword" button
- **Mode**: dropdown (Default)

#### Configurations Panel (docs.json visual editor):
Left sidebar with 10 config sections:
1. **Overview**: Docs title, Description, Simple/Advanced toggle, Favicon (file input with Clear)
2. **Visual Branding**: Theme dropdown (mint), Primary color (hex picker #16A34A), Light color (#07C983), Dark color (#15803D), Light logo (path + Clear), Dark logo (path + Clear), Logo link, Light color (#FFFFFF)
3. **Typography**: (font settings)
4. **Header & Topbar**: (header configuration)
5. **Footer**: (footer links/content)
6. **Content Features**: Thumbnail, Thumbnail background (Upload), Thumbnail font (Inter), Page eyebrow, Code block theme (system dropdown), LaTeX support (toggle, Disabled), Icon library
7. **Assistant & Search**: (search/AI config)
8. **Integrations**: (third-party integrations)
9. **API Documentation**: (OpenAPI config)
10. **Advanced**: (advanced settings)

Each section has a form-based UI with inputs, toggles, dropdowns, file uploads, and color pickers.
This is effectively a visual GUI for editing the docs.json config file.

### Analytics Page — COMPLETE
**URL**: `/{org}/{project}/analytics/v2`
**Layout**: Full-width content area with traffic toggle, date picker, sub-tab navigation, charts, and tables

#### Top Controls:
1. **Traffic source toggle**: "Humans" | "Agents" — switches between human and AI traffic views
   - **Humans mode**: Shows 5 sub-tabs — Visitors, Views, Assistant, Searches, Feedback
   - **Agents mode**: Shows 2 sub-tabs — Agent Visitors, MCP Searches
2. **Date range picker**: Button showing current range (e.g., "Apr 1 - 8"), opens calendar dialog
   - Calendar grid with clickable dates for custom range selection
   - **Preset shortcuts** (right side): Today, Yesterday, Last 7 days, Last 14 days, Last 30 days, Last 90 days, This month, Year to date, All time
   - URL query params: `?from=2026-04-01T00:00:00&to=2026-04-08T23:59:59&trafficSource=human`

#### Sub-tab Navigation:
Each tab shows its metric count in a badge (e.g., "Visitors 7", "Views 13", "Feedback 0").

**Visitors tab** (`/analytics/v2/visitors`):
- **Chart**: "Visitors Over Time" — line/bar chart with daily visitor counts, interactive SVG (Recharts or similar)
- **Top pages table**: Columns: Page path (truncated with title tooltip), Views count
- **Referrals table**: Columns: Referral source (e.g., "$direct", "dashboard.mintlify.com"), Views count
- Tables side-by-side below the chart

**Views tab** (`/analytics/v2/views`):
- **Chart**: "Page Views Over Time" — similar chart with daily page views
- **Top pages table**: Same structure as Visitors — page path + view count
- No Referrals table

**Assistant tab** (`/analytics/v2/assistant`):
- **Sub-sections**: "Categories" and "Chat history" toggle
- **Export to CSV** button
- Empty state: "No assistant activity / When users ask questions, results will show up here"

**Searches tab** (`/analytics/v2/searches`):
- Empty state: "No search activity / When users search your docs, results will show up here"

**Feedback tab** (`/analytics/v2/feedback`):
- **3 sub-tabs**: "Ratings by page" | "Detailed feedback" | "Code snippets"
  - URL param: `type=contextual` (detailed), `type=code_snippet` (code snippets)
- **Filters button**: Opens dialog with:
  - **Status filter**: Pending, In Progress, Resolved, Dismissed
  - **Show abusive** toggle
- **Table**: Columns: Feedback (text), Status (badge), Page (path), Date, Actions (checkbox for bulk select)
  - "Select all feedback" checkbox in header
- Empty state: "No feedback yet."

#### Agents Mode:
- **Agent Visitors tab**: Empty state — "No visitor activity"
- **MCP Searches tab**: Empty state — "No MCP search activity / When AI agents search your docs via MCP, results will show up here"

#### Behaviors observed:
- Tab navigation updates URL path + preserves date range and traffic source in query params
- Each tab badge shows real-time count for the selected date range
- Chart is interactive SVG (likely Recharts) — hover for tooltips
- Tables show data sorted by view count descending
- Page paths show as truncated spans with full path in title tooltip
- Switching Humans↔Agents changes the entire sub-tab set (not just data filtering)

### Settings Pages — COMPLETE
**URL**: `/{org}/{project}/settings/...`
**Layout**: Left sidebar (settings nav groups) + main content area. Same top bar as rest of dashboard.

#### Settings Navigation (left sidebar groups):
1. **Project Settings**: Domain setup, Authentication, Add-ons, General
2. **Deployment**: Git settings, GitHub app
3. **Security & Access**: API keys
4. **Workspace**: Members, Billing
5. **Account**: My profile
6. **Advanced**: Exports, Danger zone

#### Domain Setup (`/settings/deployment/custom-domain`):
- **Heading**: "Set up your custom domain"
- **Subpath toggle**: Switch (off by default) for hosting at `/docs` subpath instead of subdomain
- **Domain input**: Text field with `https://` prefix, placeholder "docs.yourdomain.com"
- **"Add domain" button**: Submits domain for DNS verification
- Flow: Enter domain → Add → shows CNAME instructions → verify DNS → TLS auto-provisioned

#### Authentication (`/settings/deployment/authentication`):
- **Enable Authentication section**: "Contact sales" button + "Learn more" link — gated feature
- **Setup authentication section**:
  - "Full authentication" with "Active" badge — gates entire docs with auth + personalization
  - **JWT config**: Pre-populated example token (`eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...`), Issuer URL, Audience fields
  - **User cache**: Cache duration setting ("24 hours") — how long sessions cached before re-auth
- Note: This is docs-site auth (protecting published docs), NOT dashboard auth

#### Add-ons (`/settings/deployment/addons`):
- **Feedback section**:
  - Thumbs rating toggle (switch, off)
  - Edit suggestions checkbox (requires public GitHub repo)
  - Raise issues checkbox (requires public GitHub repo)
  - Contextual feedback checkbox (contact sales to enable)
  - Code snippet feedback checkbox (contact sales to enable)
- **CI/CD checks section**:
  - Broken links checker — dropdown (Disabled/Enabled), checks docs for broken links on PR
  - Grammar linter — dropdown (Disabled/Enabled), Vale-based spell check + grammar
- **Previews section**:
  - Preview deployments — "This add-on is currently enabled"
  - Preview authentication toggle (switch, off) — restrict previews to org members only

#### General (`/settings/deployment/general`):
- **Project name**: Single text input with label "Deployment name", placeholder "acme", current value "namuh"
- **Save changes** button
- Very minimal page — just one field

#### Git Settings (`/settings/deployment/git-settings`):
- **Repo settings** heading with link to manual GitHub/GitLab setup docs
- **GitHub section**: Docs currently hosted in Mintlify-owned GitHub org. Options:
  - "Clone as public" button
  - "Clone as private" button
  - "Download as ZIP" button
  - "Install GitHub App" button (for using own repo)
- **GitLab section**:
  - "Configure GitLab" link → GitLab integration docs
  - "Switch to GitLab" button

#### GitHub App (`/settings/organization/github-app`):
- **Enable auto updates** heading
- **"Your active GitHub app connections"** — empty when no GitHub app installed
- **"Configure GitHub app"** section with description
- **"Install the GitHub app"** button → redirects to GitHub app install flow

#### API Keys (`/settings/organization/api-keys`):
- **Project ID** section: Read-only input showing project ID hash, with Copy button
- **Admin API keys** section:
  - "Available on Pro" badge — admin keys require paid plan
  - Link to API docs
  - "Active admin keys" list (empty by default)
  - Warning: "Please ensure to copy your API keys once generated as you may not be able to see them again."
  - "Create Admin API Key" button
- **Assistant API keys** section:
  - "Active assistant keys" list
  - Same copy warning
  - "Create Assistant API Key" button
- Key creation flow: Click create → enter name → generate key → show key once → store hashed

#### Members (`/settings/organization/members`):
- **Header**: "Team members" with member count ("1 active member")
- **Invite member** button → opens dialog:
  - Email input with placeholder "name@gmail.com"
  - Instruction: "Enter email addresses, separated by commas or spaces"
  - "Send Invite" button
- **Search** input: "Search members" filter
- **Members table**: Columns: Member (email), Date joined (formatted "Apr 5, 2026"), Actions (implicit)
- Table shows avatar/icon + email + join date per row

#### Billing (`/settings/organization/billing`) — OUT OF SCOPE:
- Shows current plan with trial info
- Plan comparison cards: Hobby ($0/mo), Pro ($250/mo)
- Yearly billing toggle (switch, on)
- Feature lists per plan
- **Note: Billing/payment is explicitly out of scope for the clone**

#### My Profile (`/settings/account`):
- **Name section**: "Update your name" — First name + Last name inputs, "Save changes" button
- **Email notifications section**: "Manage your email notification preferences"
  - "Comment reply emails" toggle (switch, on) — receive emails when someone replies to comment threads
- **Integrations section**: "Connect and authorize apps in your workspace"
  - GitHub authorization — shows "Inactive" status with "Authorize" button → links to GitHub OAuth

#### Exports (`/settings/deployment/export-docs`):
- **"Available on Enterprise"** badge — feature gated behind Enterprise plan
- Description: "Export your docs as a single PDF file for offline viewing."
- **"Export all content"** button (disabled for non-enterprise)

#### Danger Zone (`/settings/organization/danger-zone`):
- **Delete my deployment** section:
  - Warning: "Your deployment will be deleted and cannot be restored. This is irreversible."
  - "Reason for deletion" textarea (placeholder: "Why are you deleting your deployment?")
  - Red "Delete {projectName}" submit button
- **Delete my organization** section:
  - **"CRITICAL ACTION"** warning with bold text
  - Warning: "This will permanently delete your entire organization, all deployments, team members, and data. This cannot be undone."
  - "Reason for deletion" textarea
  - Red "Delete {orgName}" submit button

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

### Agents Pages — COMPLETE
**URL**: `/{org}/{project}/products/...`
**Layout**: Same dashboard layout — sidebar nav + full-width main content area

#### Agent Page (`/products/agent`):
- **Header**: "Agents / Agent"
- **Enable the Agent section**:
  - Description: "Enable the agent to keep your docs up-to-date by leveraging AI"
  - "Upgrade plan" button (plan-gated — requires Pro)
  - "Learn more" link → docs
- **Agent settings section**:
  - "Connect your Slack workspace" — shows connection status
    - Connected state: "Agent is connected to {workspaceName}" (e.g., "Engineering")
  - **GitHub app section**:
    - "Enable repository access" heading
    - "Configure GitHub app" link
    - Connected state: Lists connected repos with org/repo, branch, and permissions
      - Each repo shows: `{org}/{repo}` + `{branch}` + "All permissions"
    - "Install the GitHub app" button when not connected
- **Linear Agent promo** (sidebar card):
  - "New" badge, "Linear Agent" title
  - "Manage your docs directly from your Linear workspace"
  - "Configure Linear" link → same Agent page
  - "Close" button to dismiss

#### Assistant Page (`/products/assistant`):
- **Header**: "Agents / Assistant"
- **Usage stats bar** (top):
  - "Current monthly spend" — "$0.00"
  - "May 5 next renewal" date
  - Stats: Total questions, Answered properly, Not Answered (with counts/percentages)
  - "View more" button → navigates to analytics assistant tab
- **Tab navigation**: "General" | "Billing"

**General tab**:
- **Status & Control section**:
  - "Assistant Status" — Active/Inactive toggle switch (currently Active/checked)
  - "Enable or disable your assistant"
- **Response Handling section**:
  - "Assistant Deflection" toggle with "Recommended" badge
    - When enabled: deflect unanswered questions to support
    - Email input: `support@example.com` placeholder for deflection target
    - "Show help button on AI chat" checkbox — display "Contact support" button
  - "Save Changes" button
  - "Add-ons only available for Pro and Custom plans" — "Upgrade Plan" button
- **Search Domains section**:
  - Toggle to enable/disable
  - "Add new domain" with text input (`docs.mintlify.com` placeholder, disabled when plan-gated)
  - "Add domain" button
  - Domains list for AI assistant to search for context
- **Starter questions section**:
  - "Starter Questions /3" — shows count of configured questions
  - Toggle switch (currently off) — enable/disable starter suggestions
  - "Suggestions currently available for chat" — list of pre-configured questions

**Billing tab**:
- **Usage & Credits Overview**:
  - Progress bar: "0% (0 of 250) messages used"
  - Details: Used count, Overage Kick In threshold, Message Range (0-250), Messages Remaining (250)
  - Next Billing date (May 5, 2026), Monthly Price, Overage Spend

#### Workflows Page (`/products/workflows`):
- **Header**: "Agents / Workflows" + "New workflow" link
- **Template picker**: "What do you want to automate? Pick a workflow template to get started, or build a custom one from scratch."
- **9 template cards** (clickable links):
  1. **Changelog** — "Generate changelog entries from merged PRs and commit messages"
  2. **API docs sync** — "Update API reference when OpenAPI spec or source code changes"
  3. **Draft feature docs** — "Draft documentation for new features when code ships"
  4. **Translations** — "Translate documentation into other languages when content changes"
  5. **Enforce style guide** — "Use this to enforce consistent writing style and tone"
  6. **Typo check** — "Scan docs for spelling errors and broken formatting"
  7. **Broken link detection** — "Find and flag broken links across documentation"
  8. **SEO & metadata audit** — "Check and fix page titles, descriptions, and OG metadata"
  9. **Custom workflow** — "Build a workflow from scratch with your own configuration"

**Workflow creation form** (after clicking a template):
- **Breadcrumb**: Back arrow to template list
- **"Create workflow"** heading + "Set up your trigger, instructions, and notifications"
- **Name**: Text input (pre-filled from template, e.g., "Changelog"), placeholder "e.g. API docs sync"
- **Trigger type**: Radio button group
  - "On pull request merge" — "Runs when a pull request is merged"
    - Shows: **Trigger repos** — "Repositories to watch for pull request merges." + repo selector dropdown ("Search or select a repository")
  - "On schedule" — "Runs on a recurring schedule"
    - Shows: **Schedule** — frequency buttons: Daily | Weekly | Monthly | Custom
    - Time picker dropdown (e.g., "9:00 AM")
    - Description: "Runs weekly on Mondays at 9:00 AM GMT+9"
- **Prompt**: Large textarea, "Tell the agent what to do..." placeholder, "Supports markdown" note
- **Settings**:
  - "Additional context repos" toggle — "Repositories that the agent can reference during the workflow"
  - "Auto-merge" toggle (default on) — "Automatically merge the PR when checks pass"
- **Notifications**:
  - Slack — "Send a Slack message when a workflow finishes" + "Install Slack App" button

#### MCP Page (`/products/mcp`):
- **Header**: "Agents / MCP" + "Beta" badge
- **Hosted MCP server section**:
  - "Access your MCP server and preview available tools"
  - "Learn more" link → docs
  - **Server URL**: Read-only input with "https://" prefix + `{project}.mintlify.app/mcp` + Copy button
  - "Use the above URL to connect AI applications to your content"
- **Available tools section**:
  - "Tools exposed to connected AI clients"
  - **search_{project_slug}**: "Search across the {project} knowledge base to find relevant information, code examples, API references, and guides. Use this tool when you need to answer questions about {project}, find specific documentation, understand how features work, or locate implementation details. The search returns contextual content with titles and direct links to the documentation pages. If you need the full content of a specific page, use the get_page tool with the page path from the search results."
  - **get_page_{project_slug}**: "Retrieve the full content of a specific documentation page from {project} by its path. Use this tool when you already know the page path (e.g., from search results) and need the complete content of that page rather than just a snippet."

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
