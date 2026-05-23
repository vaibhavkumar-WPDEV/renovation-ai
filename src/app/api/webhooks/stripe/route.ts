import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";

/**
 * Stripe webhook receiver.
 * Handles subscription lifecycle + proposal deposit payments.
 */
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
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Signature verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      // TODO: sync subscription row
      break;
    case "payment_intent.succeeded":
      // TODO: mark proposal deposit_paid
      break;
    default:
      // ignore other events
      break;
  }

  return NextResponse.json({ received: true });
}
