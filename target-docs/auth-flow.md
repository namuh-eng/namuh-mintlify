<!-- Source: synthesized from dashboard/sso, deploy/authentication-setup, api/introduction docs -->
# Mintlify Auth Flow

## Dashboard Authentication (for Mintlify users/team)

### Login Methods
1. **Google OAuth** — primary method
2. **GitHub OAuth** — for developer accounts
3. **Email magic link / password** — fallback
4. **SSO (SAML/OIDC)** — Enterprise plans (Okta, Microsoft Entra, Google Workspace)

### Signup Flow
1. Go to mintlify.com/start or dashboard.mintlify.com
2. Choose auth method (Google, GitHub, email)
3. Create or join an organization
4. Onboarding flow starts (see onboarding-flow.md)

### Session Management
- Session-based authentication
- Dashboard at dashboard.mintlify.com
- Organization membership controls access
- Roles: Admin, Editor, Viewer (RBAC on Enterprise)

### Team/Org Features
- Invite members by email
- Role assignment (admin/editor/viewer)
- SSO with JIT provisioning
- SAML group → role mapping
- Audit logs (Enterprise)

## Documentation Site Authentication (for end-users reading docs)

### Available Methods
1. **Password** — shared password, basic access control (Pro)
2. **Mintlify Dashboard Auth** — org members only
3. **OAuth 2.0** — Authorization Code Flow with custom OAuth server (Enterprise)
4. **JWT** — Custom auth system with EdDSA-signed JWTs (Enterprise)
5. **Shared Links** — mentioned but details unclear

### Group-Based Access Control (OAuth/JWT)
- User info endpoint returns `groups` array
- Pages restricted to groups via frontmatter: `groups: ["admin", "beta-users"]`
- Public pages: `public: true` in frontmatter or group config

### User Data Format (OAuth/JWT)
```typescript
type User = {
  host?: string;           // Required for JWT — must match docs domain
  expiresAt?: number;      // Session expiration (Unix timestamp)
  groups?: string[];       // Group memberships for access control
  content?: Record<string, any>; // Custom data for personalization
  apiPlaygroundInputs?: {  // Pre-fill API playground fields
    server?: Record<string, string>;
    header?: Record<string, unknown>;
    query?: Record<string, unknown>;
    cookie?: Record<string, unknown>;
    path?: Record<string, unknown>;
  };
};
```

## API Authentication
- **Admin API Key** — prefix `mint_`, server-side secret, for management endpoints
- **Assistant API Key** — prefix `mint_dsc_`, public token, for assistant/search endpoints
- Bearer token auth: `Authorization: Bearer <key>`
- Up to 10 API keys per hour per org
- Keys managed at dashboard.mintlify.com/settings/organization/api-keys

## For Our Clone
Since `authMode: "better-auth"` in ralph-config.json:
- **Dashboard auth**: Google OAuth via Better Auth (matching the target's Google OAuth)
- **Session management**: Better Auth sessions stored in Postgres
- **RBAC**: Admin/Editor/Viewer roles in our DB
- **API keys**: Generate `mint_`-prefixed keys, store hashed in DB
- **Skip**: SSO/SAML, JWT docs auth, password docs auth (Enterprise features)
