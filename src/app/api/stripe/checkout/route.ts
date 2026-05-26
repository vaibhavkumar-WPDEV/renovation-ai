import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { db } from "@/db/client";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireTenant } from "@/lib/auth/tenant";
import { env } from "@/lib/env";

const PRICE_MAP: Record<string, string | undefined> = {
  starter: env.STRIPE_PRICE_STARTER,
  growth: env.STRIPE_PRICE_GROWTH,
  pro: env.STRIPE_PRICE_PRO,
};

const schema = z.object({
  plan: z.enum(["starter", "growth", "pro"]),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  if (!env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const { tenant, user } = await requireTenant().catch(() => {
    throw new Error("Unauthorized");
  });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const priceId = PRICE_MAP[parsed.data.plan];
  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe price configured for plan: ${parsed.data.plan}. Add STRIPE_PRICE_${parsed.data.plan.toUpperCase()} to env.` },
      { status: 503 },
    );
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const origin = env.NEXT_PUBLIC_APP_URL;

  // Reuse existing Stripe customer if available
  const [existingSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, tenant.id))
    .limit(1);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: existingSub?.stripeCustomerId ?? undefined,
    customer_email: existingSub?.stripeCustomerId ? undefined : user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { tenantId: tenant.id, plan: parsed.data.plan },
    success_url: parsed.data.successUrl ?? `${origin}/dashboard?upgraded=1`,
    cancel_url: parsed.data.cancelUrl ?? `${origin}/dashboard/settings`,
    subscription_data: {
      metadata: { tenantId: tenant.id },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
