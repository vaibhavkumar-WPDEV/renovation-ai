import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { leads, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { checkLimit, incrementUsage } from "@/lib/usage/meter";

const createLeadSchema = z.object({
  tenantSlug: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  fullName: z.string().optional(),
  source: z.string().optional(),
  zip: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, parsed.data.tenantSlug))
    .limit(1);
  if (!tenant) {
    return NextResponse.json({ error: "Unknown tenant" }, { status: 404 });
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
