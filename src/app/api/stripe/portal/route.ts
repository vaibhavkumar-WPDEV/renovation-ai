import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db/client";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireTenant } from "@/lib/auth/tenant";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  if (!env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const { tenant } = await requireTenant().catch(() => {
    throw new Error("Unauthorized");
  });

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, tenant.id))
    .limit(1);

  if (!sub?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account found. Subscribe to a plan first." },
      { status: 404 },
    );
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const origin = env.NEXT_PUBLIC_APP_URL;

  const body = await req.json().catch(() => ({})) as { returnUrl?: string };

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: body.returnUrl ?? `${origin}/dashboard/settings`,
  });

  return NextResponse.json({ url: session.url });
}
