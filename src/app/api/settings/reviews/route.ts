import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { tenantSettings } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";

const schema = z.object({
  googleReviewUrl: z.string().url().max(500).or(z.literal("")).optional(),
  yelpReviewUrl: z.string().url().max(500).or(z.literal("")).optional(),
  autoSend: z.boolean().optional(),
  autoSendAfterDays: z.number().int().min(1).max(90).optional(),
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

  const reviewConfig = {
    googleReviewUrl: parsed.data.googleReviewUrl || undefined,
    yelpReviewUrl: parsed.data.yelpReviewUrl || undefined,
    autoSend: parsed.data.autoSend ?? false,
    autoSendAfterDays: parsed.data.autoSendAfterDays ?? 14,
  };

  await db
    .insert(tenantSettings)
    .values({ tenantId: tenant.id, reviewConfig, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: tenantSettings.tenantId,
      set: { reviewConfig, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
