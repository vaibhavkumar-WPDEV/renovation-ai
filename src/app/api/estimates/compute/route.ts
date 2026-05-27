import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { estimates, projectScopes, tenantSettings } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";
import { computeEstimate } from "@/lib/estimate/calculator";
import { getTenantPlan } from "@/lib/usage/meter";

const schema = z.object({
  scopeId: z.string().uuid(),
});

export async function POST(req: Request) {
  let tenant;
  try {
    ({ tenant } = await requireTenant());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Budget Estimator is Pro+ per the plan
  const plan = await getTenantPlan(tenant.id);
  if (plan === "starter" || plan === "growth") {
    return NextResponse.json(
      { error: "upgrade_required", message: "The Budget Estimator is available on Pro and above." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const [scope] = await db
    .select()
    .from(projectScopes)
    .where(and(eq(projectScopes.id, parsed.data.scopeId), eq(projectScopes.tenantId, tenant.id)))
    .limit(1);
  if (!scope) {
    return NextResponse.json({ error: "Scope not found" }, { status: 404 });
  }

  const [settings] = await db
    .select()
    .from(tenantSettings)
    .where(eq(tenantSettings.tenantId, tenant.id))
    .limit(1);

  const result = computeEstimate(scope, settings?.pricingRules ?? null, tenant.currency);

  // Version estimates per scope
  const [latest] = await db
    .select({ version: estimates.version })
    .from(estimates)
    .where(eq(estimates.scopeId, scope.id))
    .orderBy(desc(estimates.version))
    .limit(1);

  const [estimate] = await db
    .insert(estimates)
    .values({
      tenantId: tenant.id,
      scopeId: scope.id,
      lineItems: result.lineItems,
      lowCents: result.lowCents,
      highCents: result.highCents,
      currency: result.currency,
      version: (latest?.version ?? 0) + 1,
    })
    .returning();

  return NextResponse.json({ estimate });
}
