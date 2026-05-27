import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { tenantSettings } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";

const schema = z.object({
  cabinetPerLinearFt: z.number().min(0).max(100000).optional(),
  countertopPerSqFt: z.number().min(0).max(100000).optional(),
  laborMultiplier: z.number().min(0).max(10).optional(),
  minProjectValue: z.number().min(0).max(10000000).optional(),
});

export async function POST(req: Request) {
  let tenant;
  try {
    ({ tenant } = await requireTenant());
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

  await db
    .insert(tenantSettings)
    .values({ tenantId: tenant.id, pricingRules: parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: tenantSettings.tenantId,
      set: { pricingRules: parsed.data, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
