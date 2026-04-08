# Mintlify DX / Developer Experience Summary

## Product Overview
Mintlify is an AI-native documentation platform. Users connect a Git repository containing MDX files + a `docs.json` config, and Mintlify builds/deploys a beautiful docs site with AI features.

## Core Developer Workflow
1. **Setup**: Sign up → connect GitHub → repo with MDX files + docs.json
2. **Write**: Edit MDX files locally (with CLI preview) or in web editor
3. **Deploy**: Push to Git → automatic deployment via GitHub App webhook
4. **Manage**: Dashboard for analytics, team, settings, agent, integrations

## CLI Tool (`mint`)
- `mint dev` — local preview with hot reload on port 3000
- `mint build` — production build
- `mint broken-links` — check for broken internal links
- `mint analytics` — view analytics from terminal
- Install: `npm i -g mint` (requires Node.js v20.17.0+)
- No custom SDK package — CLI is the developer tool

## REST API
Base URL: `https://api.mintlify.com/v1`
Auth: Bearer token with `mint_` (admin) or `mint_dsc_` (assistant) prefixed keys.

### Endpoints:
- `POST /project/update/{projectId}` — trigger deployment
- `GET /project/update-status/{statusId}` — check deployment status
- `POST /agent/v2/create-agent-job` — create AI agent job
- `GET /agent/v2/get-agent-job/{jobId}` — get agent job status
- `POST /agent/v2/send-message/{jobId}` — follow-up message to agent
- `POST /assistant/v2/create-message` — AI assistant chat (streaming)
- `GET /assistant/search` — search documentation
- `GET /assistant/get-page-content` — get page content by path
- Analytics endpoints: feedback, views, visitors, searches, assistant stats

## AI Features (Key DX)
1. **Assistant** — AI chat widget on docs site, answers questions from content, cites sources
2. **Agent** — AI that creates PRs to update docs, triggered from Slack/Linear/API/workflows
3. **MCP Server** — Model Context Protocol server for AI tools (Claude, Cursor)
4. **llms.txt** — Auto-generated index of all docs for LLM consumption
5. **skill.md** — Auto-generated capability description for AI agents
6. **Contextual Menu** — One-click buttons to send docs to ChatGPT, Claude, etc.

## Content System
- **MDX files** — Markdown + JSX components
- **docs.json** — Central config: navigation, theme, colors, API specs, integrations
- **Components**: Accordions, Cards, Tabs, Code Groups, Steps, Callouts, Expandables, Fields, etc.
- **OpenAPI integration** — Auto-generate API reference pages from OpenAPI specs
- **AsyncAPI** — WebSocket documentation support
- **Reusable snippets** — Parameterized content reuse
- **Changelogs** — Date-based entries with RSS

## Theming & Customization
- Colors: primary, light/dark mode, background
- Fonts: Google Fonts or self-hosted (heading, body, code)
- Logo: light/dark variants
- Custom React components
- Custom CSS/JS scripts
- Layout modes: default, wide, custom

## Integrations
- **Analytics**: GA4, Mixpanel, PostHog, Amplitude, Segment, Hotjar, Clarity, +12 more
- **Support**: Intercom, Front
- **Privacy**: Osano
- **SDKs**: Speakeasy, Stainless (auto-generated code samples)
- **Git**: GitHub, GitLab, GitHub Enterprise Server

## Deployment
- Default: `*.mintlify.app` subdomain
- Custom domain via CNAME
- Subpath hosting: Cloudflare Workers, Vercel rewrites, Nginx reverse proxy, AWS CloudFront
- Preview deployments per PR
- CI checks: broken links, linting, grammar

## Team Management
- Organizations → Projects
- Roles: Admin, Editor, Viewer
- SSO: Okta SAML, Microsoft Entra, Google Workspace, Okta OIDC
- Audit logs
- Deployment permissions

## What Our Clone Needs (TypeScript/Node.js Only)
1. **Dashboard** — Project management, settings, analytics, team, deployments
2. **Web Editor** — MDX editing with live preview, comments, suggestions
3. **API** — Deployment triggers, assistant, analytics export, agent jobs
4. **AI Assistant** — Chat widget that answers from indexed docs content
5. **Agent** — AI that creates PRs from prompts (Slack/Linear/API integration)
6. **CLI** — `mint dev`, `mint build` equivalent
7. **Docs Renderer** — MDX → HTML with component library, theming, navigation
8. **Git Integration** — GitHub App for auto-deploy on push
