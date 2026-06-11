import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { leads } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { checkLimit, incrementUsage } from "@/lib/usage/meter";
import { rateLimit, ipFromRequest } from "@/lib/security/rateLimit";
import { tenantFromApiKey } from "@/lib/security/apiKeys";

const createLeadSchema = z.object({
  tenantSlug: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  fullName: z.string().optional(),
  source: z.string().optional(),
  zip: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  // 30 lead submissions per minute per IP — protects tenant inboxes from spam
  const rl = rateLimit(`v1-leads:${ipFromRequest(req)}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Partner API requires a tenant-scoped key — prevents anyone from writing
  // leads into another contractor's pipeline by guessing their slug.
  const tenant = await tenantFromApiKey(req);
  if (!tenant) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Missing or invalid API key. Pass `Authorization: Bearer rk_live_...`." },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Enforce monthly lead-capture limit. We still 201 the lead so we never lose
  // a real prospect, but flag that the tenant is over their plan limit.
  const limit = await checkLimit(tenant.id, "leads");

  const [lead] = await db
    .insert(leads)
    .values({
      tenantId: tenant.id,
      email: parsed.data.email,
      phone: parsed.data.phone,
      fullName: parsed.data.fullName,
      source: parsed.data.source ?? "widget",
      zip: parsed.data.zip,
      notes: parsed.data.notes,
    })
    .returning();

  await incrementUsage(tenant.id, "leadsReceived");

  await inngest.send({
    name: "lead/created",
    data: { tenantId: tenant.id, leadId: lead.id, source: lead.source ?? undefined },
  });

  return NextResponse.json(
    { id: lead.id, status: "created", overLimit: !limit.allowed },
    { status: 201 },
  );
}
