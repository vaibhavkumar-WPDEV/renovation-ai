import { NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { proposals, tenants } from "@/db/schema";
import { rateLimit, ipFromRequest } from "@/lib/security/rateLimit";
import { env } from "@/lib/env";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const limited = rateLimit(`proposal-deposit:${ipFromRequest(req)}`, 10, 60_000);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const [proposal] = await db
    .select()
    .from(proposals)
    .where(eq(proposals.accessToken, token))
    .limit(1);
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.status !== "signed") {
    return NextResponse.json(
      { error: "Sign the proposal before paying the deposit." },
      { status: 409 },
    );
  }
  if (!proposal.depositCents || proposal.depositCents <= 0) {
    return NextResponse.json({ error: "No deposit is due on this proposal." }, { status: 400 });
  }

  const [tenant] = await db
    .select({ name: tenants.name, currency: tenants.currency })
    .from(tenants)
    .where(eq(tenants.id, proposal.tenantId))
    .limit(1);
  if (!tenant) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const proposalUrl = `${env.NEXT_PUBLIC_APP_URL}/p/${token}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: tenant.currency.toLowerCase(),
          unit_amount: proposal.depositCents,
          product_data: {
            name: `Project deposit — ${tenant.name}`,
            description: proposal.title ?? "Renovation project deposit",
          },
        },
        quantity: 1,
      },
    ],
    metadata: { proposalId: proposal.id },
    payment_intent_data: {
      metadata: { proposalId: proposal.id },
    },
    success_url: `${proposalUrl}?paid=1`,
    cancel_url: proposalUrl,
  });

  return NextResponse.json({ url: session.url });
}
