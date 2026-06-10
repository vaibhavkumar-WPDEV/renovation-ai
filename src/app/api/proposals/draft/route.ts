import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { brandkits, estimates, leads, projectScopes, proposals } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";
import { generateProposalContent, defaultDepositCents, proposalTitle } from "@/lib/ai/proposal";
import { getTenantPlan } from "@/lib/usage/meter";
import { env } from "@/lib/env";

export const maxDuration = 60;

const PROPOSAL_VALIDITY_DAYS = 30;

const schema = z.object({
  scopeId: z.string().uuid(),
  depositCents: z.number().int().min(0).max(10_000_000).optional(),
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

  // Proposal Generator is a Pro+ feature
  const plan = await getTenantPlan(tenant.id);
  if (plan === "starter" || plan === "growth") {
    return NextResponse.json(
      { error: "upgrade_required", message: "Proposals are available on Pro and above." },
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

  // A proposal always rides on the latest estimate for this scope
  const [estimate] = await db
    .select()
    .from(estimates)
    .where(eq(estimates.scopeId, scope.id))
    .orderBy(desc(estimates.version))
    .limit(1);
  if (!estimate) {
    return NextResponse.json(
      { error: "no_estimate", message: "Compute an estimate before generating a proposal." },
      { status: 400 },
    );
  }

  const [lead] = await db.select().from(leads).where(eq(leads.id, scope.leadId)).limit(1);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const [brandkit] = await db
    .select()
    .from(brandkits)
    .where(eq(brandkits.tenantId, tenant.id))
    .limit(1);

  let content;
  try {
    content = await generateProposalContent({
      tenant,
      brandkit: brandkit ?? null,
      lead,
      scope,
      estimate,
    });
  } catch {
    return NextResponse.json({ error: "Proposal generation failed. Try again." }, { status: 502 });
  }

  const accessToken = randomBytes(24).toString("base64url");
  const webUrl = `${env.NEXT_PUBLIC_APP_URL}/p/${accessToken}`;
  const expiresAt = new Date(Date.now() + PROPOSAL_VALIDITY_DAYS * 86_400_000);

  const [proposal] = await db
    .insert(proposals)
    .values({
      tenantId: tenant.id,
      leadId: lead.id,
      scopeId: scope.id,
      estimateId: estimate.id,
      accessToken,
      title: proposalTitle(scope, tenant.name),
      content,
      webUrl,
      status: "draft",
      depositCents: parsed.data.depositCents ?? defaultDepositCents(estimate),
      expiresAt,
    })
    .returning();

  return NextResponse.json({ proposal });
}
