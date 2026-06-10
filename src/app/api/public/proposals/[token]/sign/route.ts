import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, proposals, tenants, users } from "@/db/schema";
import { rateLimit, ipFromRequest } from "@/lib/security/rateLimit";
import { sendEmail } from "@/lib/email/send";
import { proposalSignedHtml, proposalSignedSubject } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { audit } from "@/lib/security/audit";

const schema = z.object({
  name: z.string().min(2).max(128),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const limited = rateLimit(`proposal-sign:${ipFromRequest(req)}`, 10, 60_000);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }

  const [proposal] = await db
    .select()
    .from(proposals)
    .where(eq(proposals.accessToken, token))
    .limit(1);
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.signedAt) {
    return NextResponse.json({ error: "This proposal is already signed." }, { status: 409 });
  }
  if (proposal.expiresAt && proposal.expiresAt.getTime() < Date.now()) {
    await db.update(proposals).set({ status: "expired" }).where(eq(proposals.id, proposal.id));
    return NextResponse.json(
      { error: "This proposal has expired. Contact the contractor for a refreshed quote." },
      { status: 410 },
    );
  }

  await db
    .update(proposals)
    .set({
      status: "signed",
      signedAt: new Date(),
      signerName: parsed.data.name.trim(),
    })
    .where(eq(proposals.id, proposal.id));

  // Reflect the signature in the pipeline ("won" waits for the deposit)
  if (proposal.leadId) {
    await db
      .update(leads)
      .set({ stage: "proposal_sent", temperature: "hot", updatedAt: new Date() })
      .where(eq(leads.id, proposal.leadId));
  }

  await audit({
    tenantId: proposal.tenantId,
    action: "proposal.signed",
    entity: "proposal",
    entityId: proposal.id,
    before: { status: proposal.status, signedAt: proposal.signedAt },
    after: { status: "signed", signerName: parsed.data.name.trim() },
    req,
  });

  // Notify the contractor owner — best-effort, never blocks the signer
  try {
    const [tenant] = await db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, proposal.tenantId))
      .limit(1);
    const [owner] = await db
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.tenantId, proposal.tenantId), eq(users.role, "owner")))
      .limit(1);
    const [lead] = proposal.leadId
      ? await db
          .select({ fullName: leads.fullName })
          .from(leads)
          .where(eq(leads.id, proposal.leadId))
          .limit(1)
      : [undefined];

    if (owner?.email && tenant) {
      await sendEmail({
        to: owner.email,
        subject: proposalSignedSubject(lead?.fullName ?? null),
        html: proposalSignedHtml({
          leadName: lead?.fullName ?? null,
          signerName: parsed.data.name.trim(),
          dashboardUrl: `${env.NEXT_PUBLIC_APP_URL}/dashboard/leads/${proposal.leadId ?? ""}`,
        }),
      });
    }
  } catch (err) {
    console.error("[proposal-sign] owner notification failed:", err);
  }

  return NextResponse.json({ ok: true });
}
