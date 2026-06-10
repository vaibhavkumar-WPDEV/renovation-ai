import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tenantSettings } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";
import { audit } from "@/lib/security/audit";

const schema = z.object({
  cabinetPerLinearFt: z.number().min(0).max(100000).optional(),
  countertopPerSqFt: z.number().min(0).max(100000).optional(),
  laborMultiplier: z.number().min(0).max(10).optional(),
  minProjectValue: z.number().min(0).max(10000000).optional(),
});

export async function POST(req: Request) {
  let tenant, user;
  try {
    ({ tenant, user } = await requireTenant());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({ pricingRules: tenantSettings.pricingRules })
    .from(tenantSettings)
    .where(eq(tenantSettings.tenantId, tenant.id))
    .limit(1);

  await db
    .insert(tenantSettings)
    .values({ tenantId: tenant.id, pricingRules: parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: tenantSettings.tenantId,
      set: { pricingRules: parsed.data, updatedAt: new Date() },
    });

  await audit({
    tenantId: tenant.id,
    actorId: user.id,
    action: "settings.pricing.updated",
    entity: "tenant_settings",
    entityId: tenant.id,
    before: existing?.pricingRules ?? null,
    after: parsed.data,
    req,
  });

  return NextResponse.json({ ok: true });
}
