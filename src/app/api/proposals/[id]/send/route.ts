import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { brandkits, leads, messages, proposals } from "@/db/schema";
import { requireTenant } from "@/lib/auth/tenant";
import { sendEmail } from "@/lib/email/send";
import { proposalHtml, proposalSubject } from "@/lib/email/templates";
import { audit } from "@/lib/security/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let tenant, user;
  try {
    ({ tenant, user } = await requireTenant());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [proposal] = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.id, id), eq(proposals.tenantId, tenant.id)))
    .limit(1);
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.status !== "draft" && proposal.status !== "sent" && proposal.status !== "viewed") {
    return NextResponse.json(
      { error: "already_signed", message: "This proposal has already been signed." },
      { status: 409 },
    );
  }
  if (!proposal.leadId || !proposal.webUrl) {
    return NextResponse.json({ error: "Proposal has no lead or URL" }, { status: 400 });
  }

  const [lead] = await db.select().from(leads).where(eq(leads.id, proposal.leadId)).limit(1);
  if (!lead?.email) {
    return NextResponse.json(
      { error: "no_email", message: "This lead has no email address on file." },
      { status: 400 },
    );
  }

  const [brandkit] = await db
    .select({ accentColor: brandkits.accentColor })
    .from(brandkits)
    .where(eq(brandkits.tenantId, tenant.id))
    .limit(1);

  const subject = proposalSubject(tenant.name);
  const html = proposalHtml({
    tenantName: tenant.name,
    leadName: lead.fullName,
    accentColor: brandkit?.accentColor ?? "#F59E0B",
    proposalUrl: proposal.webUrl,
    expiresAt: proposal.expiresAt,
  });

  await sendEmail({ to: lead.email, subject, html });

  await db.insert(messages).values({
    tenantId: tenant.id,
    leadId: lead.id,
    channel: "email",
    direction: "outbound",
    toAddress: lead.email,
    subject,
    body: `Proposal link: ${proposal.webUrl}`,
    status: "sent",
    sentAt: new Date(),
  });

  // First send moves draft → sent; re-sends keep the further-along status
  if (proposal.status === "draft") {
    await db.update(proposals).set({ status: "sent" }).where(eq(proposals.id, proposal.id));
  }
  await db
    .update(leads)
    .set({ stage: "proposal_sent", updatedAt: new Date() })
    .where(eq(leads.id, lead.id));

  await audit({
    tenantId: tenant.id,
    actorId: user.id,
    action: "proposal.sent",
    entity: "proposal",
    entityId: proposal.id,
    after: { sentTo: lead.email, status: proposal.status === "draft" ? "sent" : proposal.status },
    req,
  });

  return NextResponse.json({ ok: true, sentTo: lead.email });
}
