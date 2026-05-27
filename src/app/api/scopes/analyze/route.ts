import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, projectScopes } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";
import { analyzeScope } from "@/lib/ai/scope";
import { getTenantPlan } from "@/lib/usage/meter";
import type { Vertical } from "@/db/schema";
import { env } from "@/lib/env";

export const maxDuration = 90;

const schema = z.object({
  leadId: z.string().uuid(),
  transcript: z.string().min(10).max(20000),
  photoUrls: z.array(z.string().url()).max(3).optional(),
});

export async function POST(req: Request) {
  let tenant;
  try {
    ({ tenant } = await requireTenant());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  // Scope Analyzer is a Growth+ feature
  const plan = await getTenantPlan(tenant.id);
  if (plan === "starter") {
    return NextResponse.json(
      { error: "upgrade_required", message: "Scope analysis is available on Growth and above." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Verify the lead belongs to this tenant
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, parsed.data.leadId), eq(leads.tenantId, tenant.id)))
    .limit(1);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const analyzed = await analyzeScope({
    transcript: parsed.data.transcript,
    verticalHint: tenant.primaryVertical as Vertical,
    photoUrls: parsed.data.photoUrls,
  });

  // Version the scope: bump if one already exists for this lead
  const [latest] = await db
    .select({ version: projectScopes.version })
    .from(projectScopes)
    .where(eq(projectScopes.leadId, parsed.data.leadId))
    .orderBy(desc(projectScopes.version))
    .limit(1);

  const [scope] = await db
    .insert(projectScopes)
    .values({
      tenantId: tenant.id,
      leadId: parsed.data.leadId,
      vertical: analyzed.vertical,
      dimensions: analyzed.dimensions,
      materials: analyzed.materials,
      timeline: analyzed.timeline,
      budgetBand: analyzed.budgetBand,
      confidence: analyzed.confidence,
      rawNotes: analyzed.rawNotes,
      version: (latest?.version ?? 0) + 1,
    })
    .returning();

  return NextResponse.json({ scope });
}
