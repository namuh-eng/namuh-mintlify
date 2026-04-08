<!-- Source: synthesized from quickstart and what-is-mintlify docs -->
# Mintlify Onboarding Flow

## Overview
Mintlify's onboarding is a streamlined flow at mintlify.com/start that gets users from signup to a live documentation site.

## Step-by-Step Sequence

### Step 1: Sign Up / Log In
- User goes to mintlify.com/start
- Auth via Google OAuth, GitHub OAuth, or email
- Creates or joins an organization

### Step 2: Connect GitHub
- Connect GitHub account via Mintlify GitHub App
- Create a new repo OR select an existing repo for documentation
- **Skippable**: Users can skip GitHub connection — Mintlify creates a private repo in a private org automatically
- GitHub App enables automatic deployments on push

### Step 3: Initial Site Configuration
- Choose a project name (becomes `<project-name>.mintlify.app`)
- Basic site configuration (name, description)
- Template selection (if new repo)

### Step 4: First Deployment
- Mintlify automatically deploys the documentation site
- Site is live at `https://<project-name>.mintlify.app`
- User sees the Overview page in the dashboard

### Step 5: First Content Change (guided)
Two paths offered:
1. **Web Editor path**: Open editor → edit Introduction page → publish
2. **CLI path**: Install CLI (`npm i -g mint`) → clone repo → edit `index.mdx` → `mint dev` → push

## Empty States
- **Dashboard Overview**: Shows the deployed site URL, deployment status, quick links to editor/settings
- **Analytics**: Empty until site gets traffic — shows "No data yet" for views, searches, feedback
- **Agent**: Shows setup prompts to connect Slack/Linear/Notion
- **Editor**: Pre-populated with template content (Introduction page, quickstart, etc.)

## What "Done" Looks Like
- User has a live site at `*.mintlify.app`
- Dashboard shows successful deployment
- User can edit content via web editor or git workflow
- Navigation configured in `docs.json`

## Post-Onboarding Next Steps (shown in UI)
- Add custom domain
- Configure theme/branding
- Set up API documentation (OpenAPI)
- Enable AI assistant
- Invite team members
- Connect integrations (analytics, support)
