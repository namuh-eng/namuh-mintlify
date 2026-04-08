const VALID_ROLES = ["admin", "editor", "viewer"] as const;
type OrgRole = (typeof VALID_ROLES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Invite validation ─────────────────────────────────────────────────────────

type InviteResult =
  | { valid: true; email: string; role: OrgRole }
  | { valid: false; error: string };

export function validateInviteRequest(
  body: Record<string, unknown>,
): InviteResult {
  const rawEmail = body.email;
  if (!rawEmail || typeof rawEmail !== "string" || !rawEmail.trim()) {
    return { valid: false, error: "Email is required" };
  }

  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }

  const role = (body.role as string) || "viewer";
  if (!VALID_ROLES.includes(role as OrgRole)) {
    return {
      valid: false,
      error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
    };
  }

  return { valid: true, email, role: role as OrgRole };
}

// ── Role update validation ────────────────────────────────────────────────────

type RoleResult =
  | { valid: true; role: OrgRole }
  | { valid: false; error: string };

export function validateRoleUpdate(body: Record<string, unknown>): RoleResult {
  const role = body.role;
  if (!role || typeof role !== "string") {
    return { valid: false, error: "Role is required" };
  }
  if (!VALID_ROLES.includes(role as OrgRole)) {
    return {
      valid: false,
      error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
    };
  }
  return { valid: true, role: role as OrgRole };
}

// ── Role permission check ─────────────────────────────────────────────────────

export function canManageRole(actorRole: string, _targetRole: string): boolean {
  return actorRole === "admin";
}

// ── Response formatting ───────────────────────────────────────────────────────

interface MemberRow {
  membershipId: string;
  userId: string;
  role: OrgRole;
  joinedAt: Date;
  userName: string;
  userEmail: string;
  userImage: string | null;
}

export function formatMemberForResponse(row: MemberRow) {
  return {
    id: row.membershipId,
    userId: row.userId,
    name: row.userName,
    email: row.userEmail,
    image: row.userImage,
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
  };
}
