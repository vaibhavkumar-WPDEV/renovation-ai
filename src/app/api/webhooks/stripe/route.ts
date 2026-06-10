import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db/client";
import { subscriptions, tenants, proposals, leads } from "@/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";

function planFromMetadata(meta: Stripe.Metadata): "starter" | "growth" | "pro" | "agency" | "enterprise" {
  const p = meta?.plan as string | undefined;
  if (p === "starter" || p === "growth" || p === "pro" || p === "agency" || p === "enterprise") {
    return p;
  }
  return "starter";
}

export async function POST(req: Request) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      const tenantId = session.metadata?.tenantId;
      if (!tenantId) break;

      const plan = planFromMetadata(session.metadata ?? {});
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      const sub = await stripe.subscriptions.retrieve(subscriptionId);

      await db
        .insert(subscriptions)
        .values({
          tenantId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          plan,
          status: sub.status,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: subscriptions.tenantId,
          set: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            plan,
            status: sub.status,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            updatedAt: new Date(),
          },
        });

      // Upgrade tenant plan
      await db
        .update(tenants)
        .set({ plan, status: "active", updatedAt: new Date() })
        .where(eq(tenants.id, tenantId));

      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId = sub.metadata?.tenantId;
      if (!tenantId) break;

      const plan = planFromMetadata(sub.metadata ?? {});

      await db
        .update(subscriptions)
        .set({
          plan,
          status: sub.status,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.tenantId, tenantId));

      if (sub.status === "active") {
        await db
          .update(tenants)
          .set({ plan, status: "active", updatedAt: new Date() })
          .where(eq(tenants.id, tenantId));
      } else if (sub.status === "past_due") {
        await db
          .update(tenants)
          .set({ status: "past_due", updatedAt: new Date() })
          .where(eq(tenants.id, tenantId));
      } else if (sub.status === "canceled") {
        await db
          .update(tenants)
          .set({ status: "canceled", updatedAt: new Date() })
          .where(eq(tenants.id, tenantId));
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId = sub.metadata?.tenantId;
      if (!tenantId) break;

      await db
        .update(subscriptions)
        .set({ status: "canceled", updatedAt: new Date() })
        .where(eq(subscriptions.tenantId, tenantId));

      await db
        .update(tenants)
        .set({ status: "canceled", updatedAt: new Date() })
        .where(eq(tenants.id, tenantId));
      break;
    }

    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const proposalId = pi.metadata?.proposalId;
      if (!proposalId) break;

      const [updated] = await db
        .update(proposals)
        .set({
          status: "deposit_paid",
          depositPaidAt: new Date(),
          depositCents: pi.amount_received,
          stripePaymentIntentId: pi.id,
        })
        .where(eq(proposals.id, proposalId))
        .returning({ leadId: proposals.leadId });

      // Deposit in hand → the lead is won
      if (updated?.leadId) {
        await db
          .update(leads)
          .set({ stage: "won", updatedAt: new Date() })
          .where(eq(leads.id, updated.leadId));
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
