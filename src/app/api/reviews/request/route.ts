import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { brandkits, leads, messages, reviewRequests } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";
import { getTenantPlan } from "@/lib/usage/meter";
import { sendEmail } from "@/lib/email/send";
import { reviewRequestHtml, reviewRequestSubject } from "@/lib/email/templates";
import { env } from "@/lib/env";

const schema = z.object({
  leadId: z.string().uuid(),
});

export async function POST(req: Request) {
  let tenant;
  try {
    ({ tenant } = await requireTenant());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Review Assistant is a Growth+ feature
  const plan = await getTenantPlan(tenant.id);
  if (plan === "starter") {
    return NextResponse.json(
      { error: "upgrade_required", message: "Review requests are available on Growth and above." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, parsed.data.leadId), eq(leads.tenantId, tenant.id)))
    .limit(1);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (!lead.email && !lead.phone) {
    return NextResponse.json(
      { error: "no_contact", message: "This lead has no email or phone on file." },
      { status: 400 },
    );
  }

  // Reuse an unanswered request for this lead (resend), otherwise create one
  const [existing] = await db
    .select()
    .from(reviewRequests)
    .where(and(eq(reviewRequests.leadId, lead.id), eq(reviewRequests.tenantId, tenant.id)))
    .orderBy(desc(reviewRequests.createdAt))
    .limit(1);

  if (existing?.respondedAt) {
    return NextResponse.json(
      { error: "already_rated", message: "This customer has already responded." },
      { status: 409 },
    );
  }

  let request = existing;
  if (!request) {
    const accessToken = randomBytes(24).toString("base64url");
    [request] = await db
      .insert(reviewRequests)
      .values({
        tenantId: tenant.id,
        leadId: lead.id,
        accessToken,
        responseStatus: "pending",
      })
      .returning();
  }

  const reviewUrl = `${env.NEXT_PUBLIC_APP_URL}/r/${request.accessToken}`;

  const [brandkit] = await db
    .select({ accentColor: brandkits.accentColor })
    .from(brandkits)
    .where(eq(brandkits.tenantId, tenant.id))
    .limit(1);

  if (lead.email) {
    const subject = reviewRequestSubject(tenant.name);
    await sendEmail({
      to: lead.email,
      subject,
      html: reviewRequestHtml({
        tenantName: tenant.name,
        leadName: lead.fullName,
        accentColor: brandkit?.accentColor ?? "#F59E0B",
        reviewUrl,
      }),
    });
    await db.insert(messages).values({
      tenantId: tenant.id,
      leadId: lead.id,
      channel: "email",
      direction: "outbound",
      toAddress: lead.email,
      subject,
      body: `Review request: ${reviewUrl}`,
      status: "sent",
      sentAt: new Date(),
    });
  }

  // SMS fallback/companion when Twilio is configured
  if (lead.phone && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER) {
    try {
      const twilio = (await import("twilio")).default;
      const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        from: env.TWILIO_FROM_NUMBER,
        to: lead.phone,
        body: `Hi${lead.fullName ? ` ${lead.fullName.split(" ")[0]}` : ""}! Thanks for choosing ${tenant.name}. Mind sharing how we did? ${reviewUrl}`,
      });
      await db.insert(messages).values({
        tenantId: tenant.id,
        leadId: lead.id,
        channel: "sms",
        direction: "outbound",
        toAddress: lead.phone,
        body: `Review request: ${reviewUrl}`,
        status: "sent",
        sentAt: new Date(),
      });
    } catch (err) {
      console.error("[review-request] SMS failed:", err);
    }
  }

  await db
    .update(reviewRequests)
    .set({ sentAt: new Date(), responseStatus: "sent" })
    .where(eq(reviewRequests.id, request.id));

  return NextResponse.json({ ok: true, reviewUrl });
}
