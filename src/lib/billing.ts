import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { assistantUsage, organizationBilling, projects } from "@/lib/db/schema";

export const BILLING_PLANS = ["free", "pro", "enterprise"] as const;
export const BILLING_STATUSES = [
  "free",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
] as const;

export type BillingPlan = (typeof BILLING_PLANS)[number];
export type BillingStatus = (typeof BILLING_STATUSES)[number];
export type OrganizationBillingRow = typeof organizationBilling.$inferSelect;

export interface BillingPlanDetails {
  plan: BillingPlan;
  label: string;
  statusLabel: string;
  monthlyPriceLabel: string;
  summary: string;
  projectLimit: number | null;
  assistantMessageLimit: number | null;
  features: string[];
}

export interface BillingUsageSummary {
  projectsUsed: number | null;
  projectLimit: number | null;
  assistantMessagesUsed: number | null;
  assistantMessageLimit: number | null;
}

export interface BillingRedirectResponse {
  url: string;
}

export type BillingStateInput = {
  orgId?: string | null;
  ownerUserId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  plan?: BillingPlan | string | null;
  status?: BillingStatus | string | null;
  currentPeriodEnd?: Date | string | null;
  cancelAtPeriodEnd?: boolean | null;
  canceledAt?: Date | string | null;
  trialEndsAt?: Date | string | null;
} | null;

export type NormalizedBillingState = {
  orgId: string | null;
  ownerUserId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  plan: BillingPlan;
  status: BillingStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialEndsAt: Date | null;
};

export type BillingAccessDecision = {
  hasPaidAccess: boolean;
  canUsePaidFeatures: boolean;
  plan: BillingPlan;
  status: BillingStatus;
  reason:
    | "active_subscription"
    | "trial_subscription"
    | "development_billing_bypass"
    | "free_plan"
    | "expired_period"
    | "non_paid_status"
    | "missing_billing_state";
};

export type BillingEnv = Partial<
  Pick<
    NodeJS.ProcessEnv,
    | "NODE_ENV"
    | "STRIPE_SECRET_KEY"
    | "STRIPE_PRICE_ID"
    | "STRIPE_PRO_PRICE_ID"
    | "STRIPE_ENTERPRISE_PRICE_ID"
  >
>;

export type UpsertOrganizationBillingInput = {
  orgId: string;
  ownerUserId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  plan?: BillingPlan;
  status?: BillingStatus;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
  trialEndsAt?: Date | null;
};

export const BILLING_API_CONTRACTS = {
  checkout: "POST /api/billing/checkout returns { url: string }",
  portal: "POST /api/billing/portal returns { url: string }",
} as const;

export const BILLING_PLAN_DETAILS: Record<BillingPlan, BillingPlanDetails> = {
  free: {
    plan: "free",
    label: "Free",
    statusLabel: "Self-hosted free",
    monthlyPriceLabel: "$0/mo",
    summary:
      "Run OpenDocs yourself while you evaluate the commercial hosted features.",
    projectLimit: 1,
    assistantMessageLimit: 0,
    features: ["Self-hosted docs", "One active project", "Community support"],
  },
  pro: {
    plan: "pro",
    label: "Hosted Pro",
    statusLabel: "Active",
    monthlyPriceLabel: "$49/mo",
    summary:
      "Managed OpenDocs hosting for teams that want higher limits, support, and less infrastructure work.",
    projectLimit: 5,
    assistantMessageLimit: 5000,
    features: [
      "5 docs projects included",
      "5,000 assistant messages included",
      "Priority support",
    ],
  },
  enterprise: {
    plan: "enterprise",
    label: "Enterprise",
    statusLabel: "Active",
    monthlyPriceLabel: "Custom",
    summary:
      "Custom commercial plan for self-hosted or Namuh-managed deployments with negotiated limits.",
    projectLimit: null,
    assistantMessageLimit: null,
    features: ["Custom limits", "Deployment support", "Commercial terms"],
  },
};

const PAID_PLANS = new Set<BillingPlan>(["pro", "enterprise"]);
const ACCESS_STATUSES = new Set<BillingStatus>(["active", "trialing"]);

export function normalizeBillingPlan(plan: unknown): BillingPlan {
  return typeof plan === "string" && BILLING_PLANS.includes(plan as BillingPlan)
    ? (plan as BillingPlan)
    : "free";
}

export function normalizeBillingStatus(status: unknown): BillingStatus {
  return typeof status === "string" &&
    BILLING_STATUSES.includes(status as BillingStatus)
    ? (status as BillingStatus)
    : "free";
}

export function normalizeBillingState(
  state: BillingStateInput,
): NormalizedBillingState {
  return {
    orgId: state?.orgId ?? null,
    ownerUserId: state?.ownerUserId ?? null,
    stripeCustomerId: state?.stripeCustomerId ?? null,
    stripeSubscriptionId: state?.stripeSubscriptionId ?? null,
    stripePriceId: state?.stripePriceId ?? null,
    plan: normalizeBillingPlan(state?.plan),
    status: normalizeBillingStatus(state?.status),
    currentPeriodEnd: normalizeDate(state?.currentPeriodEnd),
    cancelAtPeriodEnd: state?.cancelAtPeriodEnd ?? false,
    canceledAt: normalizeDate(state?.canceledAt),
    trialEndsAt: normalizeDate(state?.trialEndsAt),
  };
}

export function getBillingPlanDetails(plan: unknown): BillingPlanDetails {
  return BILLING_PLAN_DETAILS[normalizeBillingPlan(plan)];
}

export function calculateBillingUsagePercent(
  used: number | null,
  limit: number | null,
): number | null {
  if (used === null || limit === null) return null;
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function formatBillingLimit(limit: number | null, noun: string): string {
  if (limit === null) return `Unlimited ${noun}`;
  return `${limit.toLocaleString()} ${noun}`;
}

export function isStripeBillingConfigured(env: BillingEnv = process.env) {
  return Boolean(env.STRIPE_SECRET_KEY?.trim());
}

export function resolveBillingPlanForPriceId(
  priceId: string | null | undefined,
  env: BillingEnv = process.env,
): BillingPlan {
  if (!priceId) return "free";
  if (env.STRIPE_ENTERPRISE_PRICE_ID === priceId) return "enterprise";
  if (env.STRIPE_PRO_PRICE_ID === priceId || env.STRIPE_PRICE_ID === priceId) {
    return "pro";
  }
  return "free";
}

export function getBillingAccessDecision(
  state: BillingStateInput,
  options: { env?: BillingEnv; now?: Date } = {},
): BillingAccessDecision {
  const normalized = normalizeBillingState(state);
  const now = options.now ?? new Date();
  const hasPaidPlan = PAID_PLANS.has(normalized.plan);

  if (!state) {
    const canUsePaidFeatures = shouldUseDevelopmentBillingBypass(options.env);
    return {
      hasPaidAccess: false,
      canUsePaidFeatures,
      plan: normalized.plan,
      status: normalized.status,
      reason: canUsePaidFeatures
        ? "development_billing_bypass"
        : "missing_billing_state",
    };
  }

  if (!hasPaidPlan) {
    const canUsePaidFeatures = shouldUseDevelopmentBillingBypass(options.env);
    return {
      hasPaidAccess: false,
      canUsePaidFeatures,
      plan: normalized.plan,
      status: normalized.status,
      reason: canUsePaidFeatures ? "development_billing_bypass" : "free_plan",
    };
  }

  if (!ACCESS_STATUSES.has(normalized.status)) {
    return {
      hasPaidAccess: false,
      canUsePaidFeatures: false,
      plan: normalized.plan,
      status: normalized.status,
      reason: "non_paid_status",
    };
  }

  const periodEnd =
    normalized.status === "trialing"
      ? (normalized.trialEndsAt ?? normalized.currentPeriodEnd)
      : normalized.currentPeriodEnd;

  if (periodEnd && periodEnd.getTime() <= now.getTime()) {
    return {
      hasPaidAccess: false,
      canUsePaidFeatures: false,
      plan: normalized.plan,
      status: normalized.status,
      reason: "expired_period",
    };
  }

  return {
    hasPaidAccess: true,
    canUsePaidFeatures: true,
    plan: normalized.plan,
    status: normalized.status,
    reason:
      normalized.status === "trialing"
        ? "trial_subscription"
        : "active_subscription",
  };
}

export function isBillingRedirectResponse(
  value: unknown,
): value is BillingRedirectResponse {
  if (!value || typeof value !== "object") return false;
  const url = (value as Record<string, unknown>).url;
  if (typeof url !== "string" || url.length === 0) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export async function readBillingApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown };
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // Some placeholder API lanes may return an empty body or HTML 404.
  }

  if (response.status === 404) {
    return `${fallback} Billing API is not configured yet.`;
  }

  return fallback;
}

export async function createBillingRedirect(
  endpoint: "/api/billing/checkout" | "/api/billing/portal",
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const contract =
    endpoint === "/api/billing/checkout"
      ? BILLING_API_CONTRACTS.checkout
      : BILLING_API_CONTRACTS.portal;
  const fallback = `Expected ${contract}.`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return {
        ok: false,
        error: await readBillingApiError(response, fallback),
      };
    }

    const data = await response.json();
    if (!isBillingRedirectResponse(data)) {
      return {
        ok: false,
        error: `${fallback} The response did not include a valid redirect URL.`,
      };
    }

    return { ok: true, url: data.url };
  } catch {
    return {
      ok: false,
      error: `${fallback} Could not reach the billing API.`,
    };
  }
}

export async function readOrganizationBilling(orgId: string) {
  const [row] = await db
    .select()
    .from(organizationBilling)
    .where(eq(organizationBilling.orgId, orgId))
    .limit(1);

  return normalizeBillingState(row ?? null);
}

export function getEnforcedBillingPlanDetails(
  state: BillingStateInput,
  options: { env?: BillingEnv; now?: Date } = {},
) {
  const decision = getBillingAccessDecision(state, options);
  return getBillingPlanDetails(
    decision.canUsePaidFeatures ? decision.plan : "free",
  );
}

export function canUseCustomDomains(
  state: BillingStateInput,
  options: { env?: BillingEnv; now?: Date } = {},
) {
  return getBillingAccessDecision(state, options).canUsePaidFeatures;
}

export function canUseAssistant(
  state: BillingStateInput,
  options: { env?: BillingEnv; now?: Date } = {},
) {
  return getBillingAccessDecision(state, options).canUsePaidFeatures;
}

export async function readOrganizationProjectCount(orgId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.orgId, orgId));

  return Number(row?.count ?? 0);
}

export function evaluateProjectCreationGate(
  state: BillingStateInput,
  projectsUsed: number,
  options: { env?: BillingEnv; now?: Date } = {},
) {
  const details = getEnforcedBillingPlanDetails(state, options);
  const allowed =
    details.projectLimit === null || projectsUsed < details.projectLimit;

  return {
    allowed,
    projectsUsed,
    projectLimit: details.projectLimit,
    plan: details.plan,
  };
}

export function evaluateCustomDomainGate(
  state: BillingStateInput,
  options: { env?: BillingEnv; now?: Date } = {},
) {
  return {
    allowed: canUseCustomDomains(state, options),
    plan: getEnforcedBillingPlanDetails(state, options).plan,
  };
}

export function evaluateAssistantMessageGate(
  state: BillingStateInput,
  messagesUsed: number,
  options: { env?: BillingEnv; now?: Date } = {},
) {
  const decision = getBillingAccessDecision(state, options);
  const details = getBillingPlanDetails(
    decision.canUsePaidFeatures ? decision.plan : "free",
  );
  const messageLimit = details.assistantMessageLimit;

  if (!decision.canUsePaidFeatures || messageLimit === 0) {
    return {
      allowed: false,
      status: "assistant_not_included" as const,
      messagesUsed,
      messageLimit,
      plan: details.plan,
    };
  }

  if (messageLimit !== null && messagesUsed >= messageLimit) {
    return {
      allowed: false,
      status: "assistant_limit_reached" as const,
      messagesUsed,
      messageLimit,
      plan: details.plan,
    };
  }

  return {
    allowed: true,
    status: "allowed" as const,
    messagesUsed,
    messageLimit,
    plan: details.plan,
  };
}

export async function canCreateProjectForOrganization(orgId: string) {
  const [billingRow] = await db
    .select()
    .from(organizationBilling)
    .where(eq(organizationBilling.orgId, orgId))
    .limit(1);
  const projectsUsed = await readOrganizationProjectCount(orgId);

  return evaluateProjectCreationGate(billingRow ?? null, projectsUsed);
}

export async function recordAssistantMessageUsage(projectId: string) {
  const [projectRow] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!projectRow) {
    return { allowed: false as const, status: "project_not_found" as const };
  }

  const [billingRow] = await db
    .select()
    .from(organizationBilling)
    .where(eq(organizationBilling.orgId, projectRow.orgId))
    .limit(1);
  const decision = getBillingAccessDecision(billingRow ?? null);
  const details = getBillingPlanDetails(
    decision.canUsePaidFeatures ? decision.plan : "free",
  );
  const messageLimit = details.assistantMessageLimit;

  if (!decision.canUsePaidFeatures || messageLimit === 0) {
    return {
      allowed: false as const,
      status: "assistant_not_included" as const,
      messagesUsed: 0,
      messageLimit,
      plan: details.plan,
    };
  }

  const usage = await db.transaction(async (tx) => {
    await tx
      .insert(assistantUsage)
      .values({
        projectId,
        messagesUsed: 0,
        messageLimit: messageLimit ?? 2_147_483_647,
        monthlyPrice: details.plan === "pro" ? 4900 : 0,
      })
      .onConflictDoNothing({ target: assistantUsage.projectId });

    const [current] = await tx
      .select({
        messagesUsed: assistantUsage.messagesUsed,
        messageLimit: assistantUsage.messageLimit,
      })
      .from(assistantUsage)
      .where(eq(assistantUsage.projectId, projectId))
      .limit(1);

    const gate = evaluateAssistantMessageGate(
      billingRow ?? null,
      current?.messagesUsed ?? 0,
    );
    if (!gate.allowed) {
      return { row: current, incremented: false };
    }

    const effectiveMessageLimit = messageLimit ?? 2_147_483_647;
    const [updated] = await tx
      .update(assistantUsage)
      .set({
        messagesUsed: sql`${assistantUsage.messagesUsed} + 1`,
        messageLimit: effectiveMessageLimit,
        monthlyPrice: details.plan === "pro" ? 4900 : 0,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(assistantUsage.projectId, projectId),
          lt(assistantUsage.messagesUsed, effectiveMessageLimit),
        ),
      )
      .returning({
        messagesUsed: assistantUsage.messagesUsed,
        messageLimit: assistantUsage.messageLimit,
      });

    if (!updated) {
      const [latest] = await tx
        .select({
          messagesUsed: assistantUsage.messagesUsed,
          messageLimit: assistantUsage.messageLimit,
        })
        .from(assistantUsage)
        .where(eq(assistantUsage.projectId, projectId))
        .limit(1);
      return { row: latest ?? current, incremented: false };
    }

    return { row: updated, incremented: true };
  });

  const messagesUsed = usage.row?.messagesUsed ?? 0;
  if (!usage.incremented) {
    return {
      allowed: false as const,
      status: "assistant_limit_reached" as const,
      messagesUsed,
      messageLimit,
      plan: details.plan,
    };
  }

  return {
    allowed: true as const,
    status: "allowed" as const,
    messagesUsed,
    messageLimit,
    plan: details.plan,
  };
}

export async function readProjectBillingAccess(projectId: string) {
  const [row] = await db
    .select({ billing: organizationBilling })
    .from(projects)
    .leftJoin(
      organizationBilling,
      eq(organizationBilling.orgId, projects.orgId),
    )
    .where(eq(projects.id, projectId))
    .limit(1);

  return getBillingAccessDecision(row?.billing ?? null);
}

export async function upsertOrganizationBilling(
  input: UpsertOrganizationBillingInput,
) {
  const normalized = normalizeBillingState(input);
  const values: typeof organizationBilling.$inferInsert = {
    orgId: input.orgId,
    ownerUserId: normalized.ownerUserId,
    stripeCustomerId: normalized.stripeCustomerId,
    stripeSubscriptionId: normalized.stripeSubscriptionId,
    stripePriceId: normalized.stripePriceId,
    plan: normalized.plan,
    status: normalized.status,
    currentPeriodEnd: normalized.currentPeriodEnd,
    cancelAtPeriodEnd: normalized.cancelAtPeriodEnd,
    canceledAt: normalized.canceledAt,
    trialEndsAt: normalized.trialEndsAt,
  };

  const [row] = await db
    .insert(organizationBilling)
    .values(values)
    .onConflictDoUpdate({
      target: organizationBilling.orgId,
      set: {
        ownerUserId: values.ownerUserId,
        stripeCustomerId: values.stripeCustomerId,
        stripeSubscriptionId: values.stripeSubscriptionId,
        stripePriceId: values.stripePriceId,
        plan: values.plan,
        status: values.status,
        currentPeriodEnd: values.currentPeriodEnd,
        cancelAtPeriodEnd: values.cancelAtPeriodEnd,
        canceledAt: values.canceledAt,
        trialEndsAt: values.trialEndsAt,
        updatedAt: new Date(),
      },
    })
    .returning();

  return normalizeBillingState(row);
}

function shouldUseDevelopmentBillingBypass(env: BillingEnv = process.env) {
  return env.NODE_ENV !== "production" && !isStripeBillingConfigured(env);
}

function normalizeDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}
