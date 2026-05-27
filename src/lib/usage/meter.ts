/**
 * Usage metering and plan-limit enforcement.
 *
 * Usage is tracked per tenant per calendar month (UTC) in the `usageMeters` table.
 * Limits come from the tenant's active subscription plan (falling back to tenants.plan).
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { subscriptions, tenants, usageMeters } from "@/db/schema";
import { limitsForPlan, type PlanName } from "@/lib/constants/plans";

type MeterField = "rendersUsed" | "leadsReceived" | "messagesSent";

const METER_COLUMN = {
  rendersUsed: usageMeters.rendersUsed,
  leadsReceived: usageMeters.leadsReceived,
  messagesSent: usageMeters.messagesSent,
} as const;

const LIMIT_KEY: Record<"renders" | "leads", { field: MeterField; limit: keyof ReturnType<typeof limitsForPlan> }> = {
  renders: { field: "rendersUsed", limit: "rendersPerMonth" },
  leads: { field: "leadsReceived", limit: "leadsPerMonth" },
};

/** Current billing period in YYYY-MM (UTC). */
export function currentPeriod(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Resolve a tenant's effective plan: active subscription first, then the tenants row. */
export async function getTenantPlan(tenantId: string): Promise<PlanName> {
  const [sub] = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, tenantId))
    .limit(1);

  if (sub && (sub.status === "active" || sub.status === "trialing")) {
    return sub.plan as PlanName;
  }

  const [tenant] = await db
    .select({ plan: tenants.plan })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  return (tenant?.plan ?? "starter") as PlanName;
}

/** Read current-period usage counts for a tenant (zeros if no row yet). */
export async function getUsage(tenantId: string, period = currentPeriod()) {
  const [row] = await db
    .select()
    .from(usageMeters)
    .where(and(eq(usageMeters.tenantId, tenantId), eq(usageMeters.period, period)))
    .limit(1);

  return {
    rendersUsed: row?.rendersUsed ?? 0,
    leadsReceived: row?.leadsReceived ?? 0,
    messagesSent: row?.messagesSent ?? 0,
  };
}

export interface LimitCheck {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  plan: PlanName;
}

/**
 * Check whether a tenant is within its monthly limit for a metered resource.
 * Does NOT increment — call `incrementUsage` after the action succeeds.
 */
export async function checkLimit(
  tenantId: string,
  meter: "renders" | "leads",
): Promise<LimitCheck> {
  const plan = await getTenantPlan(tenantId);
  const limits = limitsForPlan(plan);
  const { field, limit: limitKey } = LIMIT_KEY[meter];
  const limit = limits[limitKey] as number;

  const usage = await getUsage(tenantId);
  const used = usage[field];
  const allowed = used < limit;

  return {
    allowed,
    used,
    limit,
    remaining: limit === Infinity ? Infinity : Math.max(0, limit - used),
    plan,
  };
}

/** Atomically increment a usage counter for the current period (upsert). */
export async function incrementUsage(
  tenantId: string,
  field: MeterField,
  by = 1,
  period = currentPeriod(),
): Promise<void> {
  const column = METER_COLUMN[field];
  await db
    .insert(usageMeters)
    .values({ tenantId, period, [field]: by })
    .onConflictDoUpdate({
      target: [usageMeters.tenantId, usageMeters.period],
      set: { [field]: sql`${column} + ${by}` },
    });
}
